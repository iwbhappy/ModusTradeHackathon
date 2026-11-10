import json
from datetime import datetime
from sqlalchemy.orm import Session

from .models import Category, Department, Ticket, User, Cluster, RoutingRule, Attachment
from .domain.workflow import STATUSES, TRANSITIONS, TERMINAL
from .domain.calendar import calendar
from .db import now


def iso(value: datetime | None):
    return value.isoformat(timespec="milliseconds") + "Z" if value else None


def user_view(user: User):
    return {
        "id": user.id,
        "name": user.name,
        "role": user.role,
        "department": user.department.name,
        "vacation": user.vacation,
        "isDepartmentHead": user.is_department_head,
        "canViewCompanyAnalytics": user.can_view_company_analytics,
    }


def attachment_view(item: Attachment):
    return {"id": item.id, "name": item.name, "size": item.size}


def deadline_label(ticket: Ticket) -> str:
    if ticket.status in TERMINAL:
        return (
            "Ожидает подтверждения" if ticket.status == "Реализовано" else "Рассмотрено"
        )
    timestamp = now()
    if ticket.due_at < timestamp:
        days = calendar().days_between(ticket.due_at, timestamp)
        return f"просрочено на {days} раб. дн." if days else "срок решения истёк"
    days = calendar().days_between(timestamp, ticket.due_at)
    return f"осталось {days} раб. дн." if days else "срок сегодня"


def ticket_view(db: Session, t: Ticket, public: bool = False):
    department = lambda key: db.get(Department, key).name
    actor = lambda key: db.get(User, key).name if key else "Система"
    return {
        "id": t.id,
        "title": t.title,
        "text": t.text if not public else "",
        "type": t.type,
        "category": db.get(Category, t.category_id).name,
        "originalCategory": t.original_category,
        "priority": t.priority,
        "status": t.status,
        "authorId": t.author_id or "",
        "authorDepartment": department(t.author_department_id),
        "targetDepartment": department(t.target_department_id),
        "assigneeId": t.assignee_id,
        "createdAt": iso(t.created_at),
        "responseDueAt": iso(t.response_due_at),
        "dueAt": iso(t.due_at),
        "deadlineLabel": deadline_label(t),
        "firstResponseAt": iso(t.first_response_at),
        "implementedAt": iso(t.implemented_at),
        "closedAt": iso(t.closed_at),
        "frequency": t.frequency,
        "minutes": t.minutes,
        "monthlyCost": t.monthly_cost,
        "solution": "" if public else t.solution,
        "effect": "" if public else t.effect,
        "changed": t.changed,
        "rejection": "" if public else t.rejection,
        "confirmed": t.confirmed,
        "defaultConfirmed": t.default_confirmed,
        "escalated": t.escalated,
        "clusterId": t.cluster_links[0].cluster_id if t.cluster_links else "",
        "attachments": [] if public else [a.name for a in t.attachments],
        "attachmentFiles": []
        if public
        else [attachment_view(a) for a in t.attachments],
        "comments": []
        if public
        else [
            {
                "id": c.id,
                "date": iso(c.date),
                "author": actor(c.author_id),
                "text": c.text,
            }
            for c in t.comments
        ],
        "events": []
        if public
        else [
            {
                "id": e.id,
                "date": iso(e.date),
                "actor": actor(e.actor_id),
                "text": e.text,
                "field": e.field,
                "oldValue": e.old_value,
                "newValue": e.new_value,
                "status": e.new_value if e.field == "status" else None,
            }
            for e in t.events
        ],
        "participantCount": len(t.participants),
        "participants": [
            {
                "userId": p.user_id,
                "department": department(p.department_id),
                "context": "" if public else p.context,
                "frequency": p.frequency,
                "minutes": p.minutes,
            }
            for p in t.participants
        ],
    }


def catalog_view(db: Session, user: User | None = None):
    departments = {d.id: d.name for d in db.query(Department).all()}
    categories = {c.id: c.name for c in db.query(Category).all()}
    rules = db.query(RoutingRule).all() if user and user.role == "Администратор" else []
    return {
        "users": [user_view(u) for u in db.query(User).order_by(User.id).all()],
        "departments": list(departments.values()),
        "categories": list(categories.values()),
        "statuses": STATUSES,
        "transitions": {key: list(value) for key, value in TRANSITIONS.items()},
        "clusters": [
            {"id": c.id, "title": c.title, "keywords": json.loads(c.keywords)}
            for c in db.query(Cluster).all()
        ],
        "rules": [
            {
                "id": r.id,
                "category": categories.get(r.category_id, ""),
                "department": departments.get(r.department_id, ""),
                "primaryId": r.primary_id,
                "backupId": r.backup_id,
                "responseDays": r.response_days,
                "resolutionDays": r.resolution_days,
            }
            for r in rules
        ],
    }
