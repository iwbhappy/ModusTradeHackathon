from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models as m
from .db import now
from .domain.calendar import calendar
from .domain.errors import DomainError
from .domain.routing import choose_assignment
from .domain.permissions import can_manage, require_ticket
from .domain.workflow import (
    validate_transition,
    TERMINAL,
    DONE,
    CLOSED,
    RETURNED,
    CLARIFY,
    REVIEW,
)
from .notifier import LogNotifier
from .schemas import TicketDraft


def lookup(db: Session, model, name: str):
    item = db.scalar(select(model).where(model.name == name))
    if not item:
        raise DomainError("Выберите существующую категорию или подразделение", 422)
    return item


def cost(frequency: str, minutes: int) -> float:
    return (
        {"ежедневно": 22, "еженедельно": 4, "ежемесячно": 1, "разово": 0}[frequency]
        * minutes
        / 60
    )


def audit(
    db: Session,
    ticket: m.Ticket,
    actor: m.User | None,
    text: str,
    field: str | None = None,
    old: str | None = None,
    new: str | None = None,
    at: datetime | None = None,
):
    item = m.TicketEvent(
        ticket_id=ticket.id,
        actor_id=actor.id if actor else None,
        text=text,
        field=field,
        old_value=old,
        new_value=new,
        date=at or now(),
    )
    db.add(item)
    if actor and actor.role == "Руководитель" and not ticket.first_response_at:
        ticket.first_response_at = now()
        ticket.first_response_hours = calendar().hours_between(
            ticket.created_at, ticket.first_response_at
        )


def notify(
    db: Session,
    user_id: str | None,
    ticket: m.Ticket,
    text: str,
    dedup: str | None = None,
):
    if not user_id:
        return
    if dedup and db.scalar(
        select(m.Notification.id).where(m.Notification.dedup_key == dedup)
    ):
        return
    db.add(
        m.Notification(user_id=user_id, ticket_id=ticket.id, text=text, dedup_key=dedup)
    )
    LogNotifier().send(user_id, text)


def assignment(db: Session, category_name: str, department_name: str):
    category = lookup(db, m.Category, category_name)
    department = lookup(db, m.Department, department_name)
    users = db.scalars(select(m.User)).all()
    direction = next((u for u in users if u.can_view_company_analytics), None)
    if not direction:
        raise DomainError("Не настроен руководитель направления", 503)
    selected = choose_assignment(
        category.id,
        department.id,
        db.scalars(select(m.RoutingRule)).all(),
        users,
        department.head_id,
        direction.id,
    )
    return selected, category, department


def route_preview(db: Session, category: str, department: str):
    from .presenters import user_view, iso

    selected, _, _ = assignment(db, category, department)
    rule = selected.rule
    response, resolution = (
        (rule.response_days, rule.resolution_days) if rule else (2, 10)
    )
    primary = db.get(m.User, rule.primary_id) if rule else selected.user
    return {
        "assignee": user_view(selected.user),
        "primary": user_view(primary),
        "fallback": selected.fallback,
        "reason": selected.reason,
        "responseDays": response,
        "resolutionDays": resolution,
        "responseDueAt": iso(calendar().add_days(now(), response)),
        "dueAt": iso(calendar().add_days(now(), resolution)),
    }


def make_title(text: str, title: str = "") -> str:
    import re

    if title.strip():
        return title.strip()
    sentence = re.split(r"[.!?\n]", text.strip())[0]
    if len(sentence) <= 80:
        return sentence
    words = []
    for word in sentence.split():
        if len(" ".join([*words, word])) > 79:
            break
        words.append(word)
    return (" ".join(words) or "Обращение") + "…"


def next_ticket_id(db: Session) -> str:
    """Читаемый порядковый номер нового обращения: N-001, N-002, …"""
    used = db.scalars(select(m.Ticket.id).where(m.Ticket.id.like("N-%"))).all()
    numbers = [int(i[2:]) for i in used if i[2:].isdigit()]
    return f"N-{max(numbers, default=0) + 1:03d}"


def create_ticket(db: Session, user: m.User, draft: TicketDraft) -> m.Ticket:
    if user.role != "Сотрудник":
        raise DomainError("Создавать обращения может сотрудник", 403)
    selected, category, department = assignment(
        db, draft.category, draft.target_department
    )
    rule = selected.rule
    created = now()
    ticket = m.Ticket(
        id=next_ticket_id(db),
        title=make_title(draft.text, draft.title),
        text=draft.text.strip(),
        type=draft.type,
        category_id=category.id,
        original_category=draft.category,
        author_id=user.id,
        author_department_id=user.department_id,
        target_department_id=department.id,
        assignee_id=selected.user.id,
        priority=draft.priority,
        status="Новое",
        created_at=created,
        response_due_at=calendar().add_days(created, rule.response_days if rule else 2),
        due_at=calendar().add_days(created, rule.resolution_days if rule else 10),
        frequency=draft.frequency,
        minutes=draft.minutes,
        solution=draft.solution,
        effect=draft.effect,
        monthly_cost=cost(draft.frequency, draft.minutes)
        if draft.type == "Проблема"
        else 0,
    )
    db.add(ticket)
    db.flush()
    for attachment_id in set(draft.attachment_ids):
        item = db.get(m.Attachment, attachment_id)
        if not item or item.uploader_id != user.id or item.ticket_id:
            raise DomainError("Вложение недоступно или уже прикреплено", 403)
        item.ticket_id = ticket.id
    audit(
        db,
        ticket,
        user,
        f"{selected.reason}: {selected.user.name}",
        "assignee",
        None,
        selected.user.id,
    )
    audit(db, ticket, user, "Обращение зарегистрировано", "status", None, "Новое")
    from .ai.provider import RuleBasedProvider

    cluster_id = RuleBasedProvider().detect_cluster(db, draft.text)
    if cluster_id:
        db.add(m.TicketCluster(ticket_id=ticket.id, cluster_id=cluster_id))
    notify(db, selected.user.id, ticket, f"Новое обращение {ticket.id}: {ticket.title}")
    return ticket


def change_status(db: Session, user: m.User, ticket_id: str, status: str, text: str):
    ticket = require_ticket(db, user, ticket_id, manage=True)
    validate_transition(ticket.status, status, "manager", text)
    old = ticket.status
    ticket.status = status
    if status == DONE:
        ticket.changed, ticket.implemented_at = text.strip(), now()
        ticket.confirmed, ticket.default_confirmed = False, False
    if status == "Отклонено":
        ticket.rejection, ticket.closed_at = text.strip(), now()
    note = text.strip()
    summary = f"Статус: {status}. {note}" if note else f"Статус: {status}"
    audit(db, ticket, user, summary, "status", old, status)
    if note:
        db.add(m.Comment(ticket_id=ticket.id, author_id=user.id, text=note))
    notify(db, ticket.author_id, ticket, f"{ticket.id}: {summary[8:]}")
    return ticket


def add_comment(db: Session, user: m.User, ticket_id: str, text: str):
    ticket = require_ticket(db, user, ticket_id)
    if not text.strip():
        raise DomainError("Введите комментарий", 422)
    db.add(m.Comment(ticket_id=ticket.id, author_id=user.id, text=text.strip()))
    if ticket.status == CLARIFY and ticket.author_id == user.id:
        validate_transition(CLARIFY, REVIEW, "author", text)
        ticket.status = REVIEW
        audit(
            db,
            ticket,
            user,
            "Автор ответил на запрос уточнения",
            "status",
            CLARIFY,
            REVIEW,
        )
    else:
        audit(db, ticket, user, "Добавлен комментарий")
    recipient = ticket.author_id if can_manage(user, ticket) else ticket.assignee_id
    notify(db, recipient, ticket, f"{ticket.id}: новый комментарий")
    return ticket


def confirm(db: Session, user: m.User, ticket_id: str, solved: bool, reason: str):
    ticket = require_ticket(db, user, ticket_id)
    if ticket.author_id != user.id:
        raise DomainError("Подтвердить результат может только автор", 403)
    new = CLOSED if solved else RETURNED
    validate_transition(ticket.status, new, "author", reason)
    ticket.status, ticket.confirmed, ticket.default_confirmed = new, solved, False
    ticket.closed_at = now() if solved else None
    if not solved:
        ticket.due_at = calendar().add_days(now(), 5)
        ticket.escalated = False
        db.add(m.Comment(ticket_id=ticket.id, author_id=user.id, text=reason.strip()))
    audit(
        db,
        ticket,
        user,
        "Автор подтвердил решение" if solved else f"Автор вернул: {reason}",
        "status",
        DONE,
        new,
    )
    notify(db, ticket.assignee_id, ticket, f"{ticket.id}: {new}")
    return ticket
