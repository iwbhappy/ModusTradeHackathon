from datetime import timedelta, timezone
from io import BytesIO

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.orm import Session
from openpyxl import Workbook

from . import models as m
from .db import now
from .domain.calendar import calendar
from .domain.permissions import analytics_clause
from .domain.workflow import TERMINAL


def conditions(user: m.User, days: int):
    result = [analytics_clause(user)]
    if days:
        result.append(m.Ticket.created_at >= now() - timedelta(days=days))
    return result


def summary(db: Session, user: m.User, days: int):
    scope = conditions(user, days)
    count = lambda *extra: (
        db.scalar(select(func.count(m.Ticket.id)).where(*scope, *extra)) or 0
    )
    total = count()
    response_count = count(m.Ticket.first_response_hours.is_not(None))
    ordered = select(m.Ticket.first_response_hours).where(
        *scope, m.Ticket.first_response_hours.is_not(None)
    )
    ordered = ordered.order_by(m.Ticket.first_response_hours)
    middle = db.scalars(
        ordered.offset(max(0, (response_count - 1) // 2)).limit(
            2 if response_count % 2 == 0 else 1
        )
    ).all()
    median = sum(middle) / len(middle) if middle else 0
    average = (
        db.scalar(select(func.avg(m.Ticket.first_response_hours)).where(*scope)) or 0
    )
    result = count(
        m.Ticket.status.in_(TERMINAL),
        or_(m.Ticket.changed != "", m.Ticket.rejection != ""),
    )
    open_count = count(m.Ticket.status.not_in(TERMINAL))
    overdue = count(m.Ticket.status.not_in(TERMINAL), m.Ticket.due_at < now())
    departments = {d.id: d.name for d in db.scalars(select(m.Department)).all()}
    categories = {c.id: c.name for c in db.scalars(select(m.Category)).all()}

    def distribution(column, labels=None):
        rows = db.execute(
            select(column, func.count(m.Ticket.id)).where(*scope).group_by(column)
        ).all()
        return sorted(
            [
                {"label": labels.get(key, key) if labels else key, "value": value}
                for key, value in rows
            ],
            key=lambda row: (-row["value"], row["label"]),
        )

    def completed_count(*extra):
        where = [analytics_clause(user), *extra]
        if days:
            where.append(m.Ticket.implemented_at >= now() - timedelta(days=days))
        return db.scalar(select(func.count(m.Ticket.id)).where(*where)) or 0

    clusters = []
    for cluster in db.scalars(select(m.Cluster)).all():
        linked = m.Ticket.id.in_(
            select(m.TicketCluster.ticket_id).where(
                m.TicketCluster.cluster_id == cluster.id
            )
        )
        cluster_scope = [*scope, linked]
        size, monthly = db.execute(
            select(func.count(m.Ticket.id), func.sum(m.Ticket.monthly_cost)).where(
                *cluster_scope
            )
        ).one()
        affected = set()
        for column in [m.Ticket.author_department_id, m.Ticket.target_department_id]:
            affected.update(
                db.scalars(select(column).where(*cluster_scope).distinct()).all()
            )
        affected.update(
            db.scalars(
                select(m.Participant.department_id)
                .where(
                    m.Participant.ticket_id.in_(
                        select(m.Ticket.id).where(*cluster_scope)
                    )
                )
                .distinct()
            ).all()
        )
        recent, previous = db.execute(
            select(
                func.sum(
                    case(
                        (m.Ticket.created_at >= now() - timedelta(days=30), 1), else_=0
                    )
                ),
                func.sum(
                    case(
                        (
                            and_(
                                m.Ticket.created_at >= now() - timedelta(days=60),
                                m.Ticket.created_at < now() - timedelta(days=30),
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
            ).where(analytics_clause(user), linked)
        ).one()
        clusters.append(
            {
                "id": cluster.id,
                "title": cluster.title,
                "count": size,
                "monthlyCost": monthly or 0,
                "departments": [departments[d] for d in sorted(affected)],
                "trend": (recent or 0) - (previous or 0),
            }
        )
    matrix_rows = db.execute(
        select(
            m.Ticket.author_department_id,
            m.Ticket.target_department_id,
            func.count(m.Ticket.id),
        )
        .where(*scope, m.Ticket.type == "Проблема")
        .group_by(m.Ticket.author_department_id, m.Ticket.target_department_id)
    ).all()
    sla_rows = db.execute(
        select(m.User.department_id, func.count(m.Ticket.id))
        .join(m.Ticket, m.Ticket.assignee_id == m.User.id)
        .where(*scope, m.Ticket.status.not_in(TERMINAL), m.Ticket.due_at < now())
        .group_by(m.User.department_id)
    ).all()
    local = calendar().local(now())
    monday = (local - timedelta(days=local.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    weekly = []
    for index in range(10):
        start = (
            (monday - timedelta(weeks=9 - index))
            .astimezone(timezone.utc)
            .replace(tzinfo=None)
        )
        end = start + timedelta(days=7)
        incoming = count(m.Ticket.created_at >= start, m.Ticket.created_at < end)
        done = count(
            m.Ticket.status.in_(["Реализовано", "Закрыто"]),
            m.Ticket.implemented_at >= start,
            m.Ticket.implemented_at < end,
        )
        weekly.append(
            {"start": start.isoformat() + "Z", "incoming": incoming, "done": done}
        )
    return {
        "total": total,
        "openCount": open_count,
        "overdueCount": overdue,
        "considered": response_count / total * 100 if total else 0,
        "medianHours": median,
        "averageHours": average,
        "resultRate": result / total * 100 if total else 0,
        "implemented": completed_count(
            m.Ticket.status.in_(["Реализовано", "Закрыто"]),
            m.Ticket.implemented_at.is_not(None),
        ),
        "confirmed": completed_count(m.Ticket.confirmed.is_(True)),
        "defaultConfirmed": completed_count(m.Ticket.default_confirmed.is_(True)),
        "distributions": {
            "type": distribution(m.Ticket.type),
            "status": distribution(m.Ticket.status),
            "category": distribution(m.Ticket.category_id, categories),
        },
        "clusterStats": clusters,
        "departments": list(departments.values()),
        "weekly": weekly,
        "matrix": [
            {
                "authorDepartment": departments[a],
                "targetDepartment": departments[b],
                "count": n,
            }
            for a, b, n in matrix_rows
        ],
        "sla": [{"department": departments[d], "count": n} for d, n in sla_rows],
        "companyScope": user.role == "Администратор" or user.can_view_company_analytics,
    }


def registry(db: Session, user: m.User, days: int) -> BytesIO:
    workbook = Workbook(write_only=True)
    sheet = workbook.create_sheet("Обращения")
    sheet.append(
        [
            "ID",
            "Заголовок",
            "Тип",
            "Категория",
            "Исходная категория",
            "Статус",
            "Автор",
            "Подразделение автора",
            "Подразделение проблемы",
            "Ответственный",
            "Создано",
            "Срок ответа",
            "Срок решения",
            "Потери, чел.-ч/мес",
            "Что изменилось",
            "Отказ",
        ]
    )
    departments = {d.id: d.name for d in db.scalars(select(m.Department)).all()}
    categories = {c.id: c.name for c in db.scalars(select(m.Category)).all()}
    users = {u.id: u.name for u in db.scalars(select(m.User)).all()}

    def safe(value):
        return (
            "'" + value
            if isinstance(value, str) and value.startswith(("=", "+", "-", "@"))
            else value
        )

    for ticket in db.scalars(
        select(m.Ticket)
        .where(*conditions(user, days))
        .order_by(m.Ticket.created_at)
        .limit(50000)
    ):
        row = [
            ticket.id,
            ticket.title,
            ticket.type,
            categories[ticket.category_id],
            ticket.original_category,
            ticket.status,
            users.get(ticket.author_id, ""),
            departments[ticket.author_department_id],
            departments[ticket.target_department_id],
            users[ticket.assignee_id],
            ticket.created_at,
            ticket.response_due_at,
            ticket.due_at,
            ticket.monthly_cost,
            ticket.changed,
            ticket.rejection,
        ]
        sheet.append([safe(value) for value in row])
    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    return output
