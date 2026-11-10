"""Period activity report. Aggregates stay in SQL; list payloads contain no complaints."""

import re
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import and_, case, exists, func, literal, or_, select
from sqlalchemy.orm import Session

from . import models as m
from .config import settings
from .db import now
from .domain.errors import DomainError
from .domain.permissions import analytics_clause, visible_clause
from .domain.workflow import TERMINAL


def date_window(first: date, last: date) -> tuple[datetime, datetime]:
    if last < first:
        raise DomainError("Начало периода должно быть не позже окончания", 422)
    zone = ZoneInfo(settings().business_timezone)
    to_utc = (
        lambda day: datetime.combine(day, time.min, zone)
        .astimezone(timezone.utc)
        .replace(tzinfo=None)
    )
    try:
        return to_utc(first), to_utc(last + timedelta(days=1))
    except (OverflowError, ValueError):
        raise DomainError(
            "Диапазон дат выходит за пределы поддерживаемого календаря", 422
        ) from None


def between(column, start: datetime, end: datetime):
    return and_(column >= start, column < end)


def reached(
    status: str,
    start: datetime | None = None,
    end: datetime | None = None,
    *,
    author=False,
):
    conditions = [
        m.TicketEvent.ticket_id == m.Ticket.id,
        m.TicketEvent.field == "status",
        m.TicketEvent.new_value == status,
    ]
    if start is not None:
        conditions.append(between(m.TicketEvent.date, start, end))
    if author:
        conditions.append(m.TicketEvent.actor_id == m.Ticket.author_id)
    return exists(select(m.TicketEvent.id).where(*conditions))


def activity(start: datetime, end: datetime) -> dict:
    implemented = or_(
        between(m.Ticket.implemented_at, start, end), reached("Реализовано", start, end)
    )
    rejected = and_(
        m.Ticket.rejection != "",
        or_(
            and_(
                m.Ticket.status == "Отклонено", between(m.Ticket.closed_at, start, end)
            ),
            reached("Отклонено", start, end),
        ),
    )
    return {
        "incoming": between(m.Ticket.created_at, start, end),
        "implemented": implemented,
        "rejected": rejected,
        "resolved": or_(implemented, rejected),
        "confirmed": or_(
            and_(m.Ticket.confirmed.is_(True), between(m.Ticket.closed_at, start, end)),
            reached("Закрыто", start, end, author=True),
        ),
        "closed": or_(
            and_(m.Ticket.status == "Закрыто", between(m.Ticket.closed_at, start, end)),
            reached("Закрыто", start, end),
        ),
    }


def period_stats(db: Session, user: m.User, start: datetime, end: datetime) -> dict:
    flags = activity(start, end)
    row = db.execute(
        select(
            *(
                func.count(case((flags[key], 1))).label(key)
                for key in ("incoming", "resolved", "confirmed")
            ),
            func.coalesce(
                func.sum(case((flags["implemented"], m.Ticket.monthly_cost), else_=0)),
                0,
            ).label("savedHours"),
        ).where(analytics_clause(user))
    ).one()
    return {
        key: round(value, 1) if key == "savedHours" else value
        for key, value in row._mapping.items()
    }


def compare(current: dict, previous: dict) -> dict:
    return {
        key: {
            "value": value,
            "previous": previous[key],
            "delta": round(value - previous[key], 1),
            "percent": (
                round((value - previous[key]) / previous[key] * 100, 1)
                if previous[key]
                else None
            ),
        }
        for key, value in current.items()
    }


def list_query(user: m.User):
    return select(
        m.Ticket.id,
        m.Ticket.title,
        m.Ticket.status,
        m.Ticket.changed,
        m.Ticket.rejection,
        m.Ticket.assignee_id.label("assigneeId"),
        m.Ticket.monthly_cost.label("monthlyCost"),
        case((visible_clause(user), True), else_=False).label("canRead"),
    ).where(analytics_clause(user))


def list_items(db: Session, user: m.User, condition) -> list[dict]:
    return [
        dict(row._mapping)
        for row in db.execute(
            list_query(user)
            .where(condition)
            .order_by(m.Ticket.created_at.desc(), m.Ticket.id)
        )
    ]


def short_group(counts: dict, changes: list[str]) -> str:
    sentences = [
        re.split(r"(?<=[.!?])\s+", text.strip())[0] for text in changes if text.strip()
    ][:2]
    count = counts["implemented"]
    ending = (
        "изменений"
        if 11 <= count % 100 <= 14
        else (
            "изменение"
            if count % 10 == 1
            else "изменения" if count % 10 in {2, 3, 4} else "изменений"
        )
    )
    result = f"Реализовано {count} {ending}"
    if sentences:
        result += ": " + " ".join(sentences)
    else:
        result += f"; мотивированных отказов — {counts['rejected']}."
    return (
        result.rstrip(".; ")
        + f". Ещё {counts['working']} в работе; новых — {counts['incoming']}."
    )


def new_topics(db: Session, user: m.User, start: datetime, end: datetime) -> list[dict]:
    from .ai.clusters import emerging

    topics = []
    for group in emerging(db, user, days=None):
        first_seen = datetime.fromisoformat(group["firstSeen"].removesuffix("Z"))
        if start <= first_seen < end:
            ids = [item["id"] for item in group["tickets"]]
            items = list_items(
                db, user, and_(m.Ticket.id.in_(ids), m.Ticket.created_at < end)
            )
            if len(items) >= 2:
                topics.append(
                    {
                        "title": group["suggestedTitle"],
                        "firstSeen": group["firstSeen"],
                        "departments": group["departments"],
                        "monthlyCost": sum(t["monthlyCost"] for t in items),
                        "tickets": items,
                    }
                )
    return topics


def period_report(db: Session, user: m.User, first: date, last: date) -> dict:
    start, end = date_window(first, last)
    analytics_clause(user)
    period_days = (last - first).days + 1
    try:
        previous_start, _ = date_window(
            first - timedelta(days=period_days), first - timedelta(days=1)
        )
    except OverflowError:
        raise DomainError(
            "Период слишком велик для сравнения с предыдущим", 422
        ) from None
    metrics = compare(
        period_stats(db, user, start, end),
        period_stats(db, user, previous_start, start),
    )
    flags = activity(start, end)
    movement = or_(
        *flags.values(),
        exists(
            select(m.TicketEvent.id).where(
                m.TicketEvent.ticket_id == m.Ticket.id,
                m.TicketEvent.field == "status",
                between(m.TicketEvent.date, start, end),
            )
        ),
    )
    cluster_id = (
        select(m.TicketCluster.cluster_id)
        .where(m.TicketCluster.ticket_id == m.Ticket.id)
        .order_by(m.TicketCluster.cluster_id)
        .limit(1)
        .scalar_subquery()
    )
    group_id = case(
        (cluster_id.is_not(None), literal("cluster:") + cluster_id),
        else_=literal("category:") + m.Ticket.category_id,
    )
    base = (
        list_query(user)
        .add_columns(
            group_id.label("groupId"),
            m.Ticket.author_department_id.label("authorDepartment"),
            m.Ticket.target_department_id.label("targetDepartment"),
            *(
                case((flags[key], 1), else_=0).label(key)
                for key in ("incoming", "implemented", "rejected", "closed")
            ),
            case(
                (m.Ticket.status.in_(["В работе", "Возвращено автором"]), 1), else_=0
            ).label("working"),
        )
        .where(movement)
        .subquery()
    )
    titles = {"cluster:" + c.id: c.title for c in db.scalars(select(m.Cluster))}
    titles.update({"category:" + c.id: c.name for c in db.scalars(select(m.Category))})
    departments = {d.id: d.name for d in db.scalars(select(m.Department))}
    counts = db.execute(
        select(
            base.c.groupId,
            *(
                func.sum(base.c[key]).label(key)
                for key in ("incoming", "implemented", "rejected", "closed", "working")
            ),
            func.sum(base.c.monthlyCost).label("monthlyCost"),
        ).group_by(base.c.groupId)
    ).all()
    groups = {
        row.groupId: {
            "id": row.groupId,
            "title": titles[row.groupId],
            "departments": set(),
            "counts": {
                key: row._mapping[key]
                for key in ("incoming", "implemented", "rejected", "closed", "working")
            },
            "monthlyCost": row.monthlyCost or 0,
            "tickets": [],
        }
        for row in counts
    }
    for row in db.execute(select(base).order_by(base.c.id)):
        item = dict(row._mapping)
        group = groups[item["groupId"]]
        group["departments"].update(
            [
                departments[item["authorDepartment"]],
                departments[item["targetDepartment"]],
            ]
        )
        group["tickets"].append(
            {
                **{
                    key: item[key]
                    for key in (
                        "id",
                        "title",
                        "status",
                        "changed",
                        "rejection",
                        "assigneeId",
                        "monthlyCost",
                        "canRead",
                    )
                },
                "activity": {
                    key: item[key]
                    for key in ("incoming", "implemented", "rejected", "closed")
                },
            }
        )
    for group_id, department_id in db.execute(
        select(base.c.groupId, m.Participant.department_id)
        .join(m.Participant, m.Participant.ticket_id == base.c.id)
        .distinct()
    ):
        groups[group_id]["departments"].add(departments[department_id])
    for group in groups.values():
        group["departments"] = sorted(group["departments"])
        changes = [
            t["changed"]
            for t in group["tickets"]
            if t["activity"]["implemented"] and t["changed"]
        ]
        group["brief"] = short_group(group["counts"], changes)
    timestamp = now()
    active = m.Ticket.status.not_in(TERMINAL)
    attention_conditions = [
        ("escalated", "Эскалировано", and_(active, m.Ticket.escalated.is_(True))),
        ("overdue", "Просрочено", and_(active, m.Ticket.due_at < timestamp)),
        ("returned", "Возвращено авторами", m.Ticket.status == "Возвращено автором"),
        (
            "awaiting",
            "Ждут ответа автора дольше 3 дней",
            and_(
                m.Ticket.status.in_(["Ожидает уточнения", "Реализовано"]),
                or_(
                    and_(
                        m.Ticket.status == "Реализовано",
                        m.Ticket.implemented_at < timestamp - timedelta(days=3),
                    ),
                    and_(
                        m.Ticket.status == "Ожидает уточнения",
                        func.coalesce(
                            select(func.max(m.TicketEvent.date))
                            .where(
                                m.TicketEvent.ticket_id == m.Ticket.id,
                                m.TicketEvent.field == "status",
                                m.TicketEvent.new_value == "Ожидает уточнения",
                            )
                            .scalar_subquery(),
                            m.Ticket.created_at,
                        )
                        < timestamp - timedelta(days=3),
                    ),
                ),
            ),
        ),
    ]
    attention = []
    for key, label, condition in attention_conditions:
        count = (
            db.scalar(
                select(func.count(m.Ticket.id)).where(analytics_clause(user), condition)
            )
            or 0
        )
        if count:
            attention.append(
                {
                    "id": key,
                    "label": label,
                    "count": count,
                    "tickets": list_items(db, user, condition),
                }
            )
    topics = new_topics(db, user, start, end)
    if topics:
        attention.append(
            {
                "id": "emerging",
                "label": "Новые зарождающиеся проблемы",
                "count": len(topics),
                "tickets": list(
                    {t["id"]: t for group in topics for t in group["tickets"]}.values()
                ),
            }
        )
    return {
        "from": first.isoformat(),
        "to": last.isoformat(),
        "previousFrom": (first - timedelta(days=(last - first).days + 1)).isoformat(),
        "previousTo": (first - timedelta(days=1)).isoformat(),
        "companyScope": user.role == "Администратор" or user.can_view_company_analytics,
        "metrics": metrics,
        "attention": attention,
        "attentionAsOf": timestamp.isoformat() + "Z",
        "groups": sorted(
            groups.values(),
            key=lambda g: (
                -bool(g["counts"]["implemented"]),
                -g["monthlyCost"],
                g["id"],
            ),
        ),
        "newTopics": topics,
    }


def summary_payload(db: Session, report: dict) -> dict:
    from .ai.summary import remove_known_names

    return remove_known_names(
        db,
        {
            "groups": [
                {
                    "id": g["id"],
                    "title": g["title"],
                    "counts": g["counts"],
                    "results": [
                        value
                        for t in g["tickets"]
                        for value in [
                            t["changed"] if t["activity"]["implemented"] else "",
                            t["rejection"] if t["activity"]["rejected"] else "",
                        ]
                        if value
                    ],
                }
                for g in report["groups"]
            ]
        },
    )
