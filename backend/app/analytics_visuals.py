from datetime import timedelta

from sqlalchemy import and_, case, func, or_, select

from . import models as m
from .db import now
from .domain.calendar import calendar
from .domain.permissions import analytics_clause
from .domain.workflow import TERMINAL
from .reports import compare, period_stats, reached


def bounds(db, user, days):
    end = now()
    start = (
        end - timedelta(days=days)
        if days
        else db.scalar(
            select(func.min(m.Ticket.created_at)).where(analytics_clause(user))
        )
    )
    return start or end - timedelta(days=90), end


def stage_condition(stage):
    implemented = or_(m.Ticket.implemented_at.is_not(None), reached("Реализовано"))
    work = or_(
        implemented,
        reached("В работе"),
        m.Ticket.status.in_(["В работе", "Возвращено автором"]),
    )
    return {
        "incoming": True,
        "considered": or_(
            work, m.Ticket.first_response_at.is_not(None), m.Ticket.status != "Новое"
        ),
        "work": work,
        "implemented": implemented,
        "confirmed": and_(implemented, m.Ticket.confirmed.is_(True)),
    }.get(stage)


def health_condition(health, timestamp=None):
    timestamp = timestamp or now()
    soon = calendar().add_days(timestamp, 3)
    condition = {
        "onTime": m.Ticket.due_at > soon,
        "soon": and_(m.Ticket.due_at >= timestamp, m.Ticket.due_at <= soon),
        "overdue": m.Ticket.due_at < timestamp,
    }.get(health)
    return (
        and_(m.Ticket.status.not_in(TERMINAL), condition)
        if condition is not None
        else None
    )


def enrich(db, user, days, scope, weekly):
    start, end = bounds(db, user, days)
    metrics = compare(
        period_stats(db, user, start, end),
        period_stats(db, user, start - (end - start), start),
    )
    for key, item in metrics.items():
        item["series"] = [
            week[
                {
                    "incoming": "incoming",
                    "resolved": "done",
                    "confirmed": "confirmed",
                    "savedHours": "savedHours",
                }[key]
            ]
            for week in weekly
        ]
    keys = [
        ("incoming", "Поступило"),
        ("considered", "Рассмотрено"),
        ("work", "В работе"),
        ("implemented", "Реализовано"),
        ("confirmed", "Подтверждено автором"),
    ]
    counts = db.execute(
        select(*(func.count(case((stage_condition(key), 1))) for key, _ in keys)).where(
            *scope
        )
    ).one()
    funnel = [
        {"key": key, "label": label, "value": counts[i]}
        for i, (key, label) in enumerate(keys)
    ]
    rows = db.execute(
        select(
            m.Department.name.label("department"),
            *(
                func.count(case((health_condition(key, end), 1))).label(key)
                for key in ("onTime", "soon", "overdue")
            ),
        )
        .select_from(m.Ticket)
        .join(m.User, m.Ticket.assignee_id == m.User.id)
        .join(m.Department, m.User.department_id == m.Department.id)
        .where(*scope, m.Ticket.status.not_in(TERMINAL))
        .group_by(m.Department.name)
    ).all()
    return {
        "metrics": metrics,
        "funnel": funnel,
        "deadlineHealth": sorted(
            [dict(row._mapping) for row in rows],
            key=lambda row: (-row["overdue"], row["department"]),
        ),
    }
