"""Local rules and allowlisted inputs for the three explicit AI assistants."""

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models as m
from ..domain.errors import DomainError
from ..domain.permissions import analytics_clause, can_read
from .embeddings import load_vectors
from .provider import provider
from .summary import remove_known_names


def completeness_rules(text: str) -> dict:
    text = text.lower().replace("ё", "е")
    checks = [
        (
            r"\b(?:этап\w*|при|когда)\b|на объекте|проектирован|закуп|согласован|подач|пнр|сервис|монтаж|поставк",
            "Где и на каком этапе возникает проблема?",
        ),
        (
            r"кажд|часто|раз в|иногда|ежеднев|еженедел|ежемесяч|\d",
            "Как часто это происходит: каждый раз или иногда?",
        ),
        (
            r"\d|например|номер|№",
            "Есть ли конкретный пример — номер заявки или объекта?",
        ),
    ]
    questions = [
        question for pattern, question in checks if not re.search(pattern, text)
    ]
    return {"complete": not questions, "questions": questions}


def verification(ticket: m.Ticket) -> str:
    if ticket.confirmed:
        return "подтверждено автором"
    if ticket.status == "Возвращено автором" or any(
        e.field == "status" and e.new_value == "Возвращено автором"
        for e in ticket.events
    ):
        return "возвращено автором"
    if ticket.default_confirmed:
        return "закрыто автоматически, без подтверждения автора"
    return "ожидает подтверждения автора"


def root_cause_input(db: Session, user: m.User, cluster_id: str):
    scope = analytics_clause(user)
    cluster = db.get(m.Cluster, cluster_id)
    if not cluster:
        raise DomainError("Кластер не найден", 404)
    tickets = list(
        db.scalars(
            select(m.Ticket)
            .join(m.TicketCluster)
            .where(scope, m.TicketCluster.cluster_id == cluster_id)
            .order_by(m.Ticket.monthly_cost.desc(), m.Ticket.id)
        )
    )
    if not tickets:
        raise DomainError("В кластере нет обращений в вашей области доступа", 404)
    departments = {d.id: d.name for d in db.scalars(select(m.Department))}
    affected = sorted(
        {
            departments[d]
            for t in tickets
            for d in [t.author_department_id, t.target_department_id]
            + [p.department_id for p in t.participants]
        }
    )
    # Keep both successful and unconfirmed attempts among the 15 source cases.
    confirmed = sorted(
        [t for t in tickets if t.confirmed and t.changed and t.implemented_at],
        key=lambda t: (t.implemented_at, t.id),
        reverse=True,
    )
    tried = sorted(
        [t for t in tickets if t.implemented_at and t.changed],
        key=lambda t: (t.implemented_at, t.id),
        reverse=True,
    )
    selected = list({t.id: t for t in confirmed[:3] + tried[:3] + tickets}.values())[
        :15
    ]
    payload = {
        "title": cluster.title,
        "departments": affected,
        "monthlyCost": round(sum(t.monthly_cost or 0 for t in tickets), 1),
        "tickets": [
            {
                "id": t.id,
                "title": t.title,
                "text": re.split(r"(?<=[.!?])\s+", t.text.strip())[0][:600],
                "status": t.status,
                "changed": t.changed[:1200],
                "rejection": t.rejection[:600],
                "verification": verification(t),
            }
            for t in selected
        ],
    }
    fallback = {
        "cause": f"Повторяется в {len(tickets)} обращениях из {len(affected)} подразделений",
        "solution": (
            confirmed[0].changed[:320]
            if confirmed
            else "Назначить владельца проблемы и решить её системно"
        ),
        "evidence": [
            t.id
            for t in sorted(selected, key=lambda t: (-(t.monthly_cost or 0), t.id))[:4]
        ],
        "tried": (
            f"{tried[0].id}: {tried[0].changed[:150]}. {verification(tried[0])}"[:260]
            if tried
            else ""
        ),
    }
    # All members, including those outside the 15-item prompt, invalidate the cache.
    revision = sorted((t.id, t.version) for t in tickets)
    return remove_known_names(db, payload), fallback, revision


def solution_hints_input(db: Session, user: m.User, ticket: m.Ticket):
    categories = {c.id: c.name for c in db.scalars(select(m.Category))}
    departments = {d.id: d.name for d in db.scalars(select(m.Department))}
    solved = list(
        db.scalars(
            select(m.Ticket).where(
                m.Ticket.id != ticket.id,
                m.Ticket.status.in_(["Реализовано", "Закрыто"]),
                m.Ticket.implemented_at.is_not(None),
                m.Ticket.changed != "",
            )
        )
    )
    vectors = load_vectors(db)
    candidates = [
        {
            "id": t.id,
            "title": t.title,
            "text": t.text,
            "status": t.status,
            "category": categories[t.category_id],
            "targetDepartment": departments[t.target_department_id],
            "vector": vectors.get(t.id),
        }
        for t in solved
    ]
    matches = provider.solutions(
        ticket.title + ". " + ticket.text,
        categories[ticket.category_id],
        departments[ticket.target_department_id],
        candidates,
    )
    by_id = {t.id: t for t in solved}
    similar = [
        {
            "id": t.id,
            "title": t.title,
            "changed": t.changed,
            "verification": verification(t),
            "canRead": can_read(user, t),
            "assigneeId": t.assignee_id,
        }
        for t in (by_id[item["id"]] for item in matches)
    ]
    payload = remove_known_names(
        db,
        {
            "title": ticket.title,
            "text": ticket.text,
            "category": categories[ticket.category_id],
            "similar": [
                {key: t[key] for key in ("id", "title", "changed", "verification")}
                for t in similar
            ],
        },
    )
    recommendation = (
        f"Похожий случай {similar[0]['id']} решили так: {similar[0]['changed'][:210]}. Проверьте, применимо ли здесь"[
            :360
        ]
        if similar
        else "Похожих решённых обращений нет: это новая проблема. Начните с запроса уточнения: этап, частота и конкретный пример."
    )
    return payload, similar, {"recommendation": recommendation}
