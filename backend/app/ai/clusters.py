"""Повторяющиеся проблемы: привязка обращений к кластерам и ранние сигналы.

Два сценария:
- новое обращение автоматически относится к известной повторяющейся проблеме;
- обращения вне известных кластеров группируются по смыслу — это «зарождающиеся
  проблемы», которые руководитель может оформить в новый кластер одним действием.
"""

from datetime import timedelta
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models as m
from ..config import settings
from ..db import now
from ..domain.errors import DomainError
from ..domain.permissions import analytics_clause
from .embeddings import embedder, group_similar, load_vectors, nearest_cluster, sync_embeddings
from .provider import RuleBasedProvider


def assign_cluster(db: Session, ticket: m.Ticket) -> str:
    """Определяет кластер нового обращения: по смыслу, иначе по ключевым словам."""
    cluster_id = ""
    if embedder.ready:
        sync_embeddings(db)
        vectors = load_vectors(db)
        members: dict[str, list] = {}
        for link in db.scalars(select(m.TicketCluster)):
            if link.ticket_id in vectors and link.ticket_id != ticket.id:
                members.setdefault(link.cluster_id, []).append(vectors[link.ticket_id])
        if ticket.id in vectors and members:
            cluster_id, _ = nearest_cluster(
                vectors[ticket.id], members, settings().cluster_threshold
            )
    cluster_id = cluster_id or RuleBasedProvider().detect_cluster(db, ticket.text)
    if cluster_id:
        db.add(m.TicketCluster(ticket_id=ticket.id, cluster_id=cluster_id))
    return cluster_id


def emerging(db: Session, user: m.User, days: int = 60) -> list[dict]:
    """Группы похожих проблем, которые ещё не отнесены ни к одному кластеру."""
    scope = analytics_clause(user)
    if not embedder.ready:
        return []
    vectors = load_vectors(db)
    clustered = select(m.TicketCluster.ticket_id)
    tickets = {
        t.id: t
        for t in db.scalars(
            select(m.Ticket).where(
                scope,
                m.Ticket.type == "Проблема",
                m.Ticket.status != "Отклонено",
                m.Ticket.created_at >= now() - timedelta(days=days),
                m.Ticket.id.not_in(clustered),
            )
        )
        if t.id in vectors
    }
    departments = {d.id: d.name for d in db.scalars(select(m.Department))}
    groups = group_similar(
        {i: vectors[i] for i in tickets}, settings().cluster_threshold
    )
    result = []
    for ids in groups:
        items = sorted((tickets[i] for i in ids), key=lambda t: t.created_at)
        affected = {t.author_department_id for t in items} | {
            t.target_department_id for t in items
        }
        result.append(
            {
                "tickets": [{"id": t.id, "title": t.title} for t in items],
                "departments": sorted(departments[d] for d in affected),
                "monthlyCost": sum(t.monthly_cost or 0 for t in items),
                "firstSeen": items[0].created_at.isoformat() + "Z",
                "suggestedTitle": items[0].title,
            }
        )
    return result


def create_cluster(
    db: Session, user: m.User, title: str, ticket_ids: list[str]
) -> m.Cluster:
    """Оформляет группу обращений как новую повторяющуюся проблему."""
    if user.role != "Администратор" and not user.can_view_company_analytics:
        raise DomainError("Новый кластер оформляет руководитель направления или администратор", 403)
    title = title.strip()
    if len(title) < 5:
        raise DomainError("Укажите название проблемы: минимум 5 символов", 422)
    tickets = db.scalars(select(m.Ticket).where(m.Ticket.id.in_(ticket_ids))).all()
    if len(tickets) < 2:
        raise DomainError("Для кластера нужно минимум два обращения", 422)
    cluster = m.Cluster(id=f"auto-{uuid4().hex[:8]}", title=title, keywords="[]")
    db.add(cluster)
    db.flush()
    linked = set(
        db.scalars(
            select(m.TicketCluster.ticket_id).where(
                m.TicketCluster.ticket_id.in_(ticket_ids)
            )
        )
    )
    for ticket in tickets:
        if ticket.id not in linked:
            db.add(m.TicketCluster(ticket_id=ticket.id, cluster_id=cluster.id))
    return cluster
