from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..models import Participant, Ticket, User
from .errors import DomainError


def can_manage(user: User, ticket: Ticket) -> bool:
    return user.role == "Руководитель" and (
        ticket.assignee_id == user.id
        or (user.can_view_company_analytics and ticket.escalated)
        or (
            user.is_department_head
            and ticket.assignee.department_id == user.department_id
        )
    )


def can_read(user: User, ticket: Ticket) -> bool:
    if user.role == "Администратор":
        return True
    return (
        can_manage(user, ticket)
        or (
            user.role == "Руководитель"
            and user.is_department_head
            and ticket.author_department_id == user.department_id
        )
        or (
            user.role == "Сотрудник"
            and (
                ticket.author_id == user.id
                or any(p.user_id == user.id for p in ticket.participants)
            )
        )
    )


def visible_clause(user: User):
    if user.role == "Администратор":
        return True
    if user.role == "Сотрудник":
        return or_(
            Ticket.author_id == user.id,
            Ticket.id.in_(
                select(Participant.ticket_id).where(Participant.user_id == user.id)
            ),
        )
    if user.is_department_head:
        return or_(
            Ticket.author_department_id == user.department_id,
            Ticket.assignee_id == user.id,
            Ticket.assignee_id.in_(
                select(User.id).where(User.department_id == user.department_id)
            ),
            Ticket.escalated.is_(True) if user.can_view_company_analytics else False,
        )
    return Ticket.assignee_id == user.id


def analytics_clause(user: User):
    if user.role == "Администратор":
        return True
    if user.role != "Руководитель":
        raise DomainError("Аналитика доступна руководителю и администратору", 403)
    return True if user.can_view_company_analytics else visible_clause(user)


def require_ticket(
    db: Session, user: User, ticket_id: str, manage: bool = False
) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise DomainError("Обращение не найдено", 404)
    if not (can_manage(user, ticket) if manage else can_read(user, ticket)):
        if manage and can_read(user, ticket):
            raise DomainError(
                f"Решение по обращению принимает ответственный: {ticket.assignee.name}",
                403,
            )
        raise DomainError("Нет доступа к содержимому этого обращения", 403)
    return ticket
