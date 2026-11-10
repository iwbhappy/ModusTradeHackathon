import json
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, Query, UploadFile
from fastapi.responses import StreamingResponse
from urllib.parse import quote
from sqlalchemy import func, select

from . import analytics, models as m, schemas as s, services
from .auth import Admin, CurrentUser, Database, issue_token
from .domain.errors import DomainError
from .domain.permissions import require_ticket, visible_clause
from .domain.workflow import TERMINAL
from .presenters import attachment_view, catalog_view, iso, ticket_view, user_view
from .storage import storage
from .ai.provider import provider

router = APIRouter(prefix="/api")


@router.get("/auth/demo-users")
def demo_users(db: Database):
    return [
        user_view(user) for user in db.scalars(select(m.User).order_by(m.User.id)).all()
    ]


@router.post("/auth/demo-login")
def login(data: s.Login, db: Database):
    user = db.get(m.User, data.user_id)
    if not user:
        raise DomainError("Демо-пользователь не найден", 404)
    return {"token": issue_token(user), "user": user_view(user)}


@router.get("/catalog")
def catalog(db: Database, user: CurrentUser):
    return catalog_view(db, user)


def filters(
    db,
    statement,
    search="",
    department="",
    category="",
    status="",
    priority="",
    overdue=False,
    cluster="",
    authorDepartment="",
    targetDepartment="",
    assigneeDepartment="",
):
    if search:
        pattern = "%" + search.replace("%", "\\%").replace("_", "\\_") + "%"
        statement = statement.where(
            m.Ticket.title.ilike(pattern, escape="\\")
            | m.Ticket.text.ilike(pattern, escape="\\")
            | m.Ticket.id.ilike(pattern, escape="\\")
        )
    for model, value, column in [
        (m.Department, department or targetDepartment, m.Ticket.target_department_id),
        (m.Department, authorDepartment, m.Ticket.author_department_id),
        (m.Category, category, m.Ticket.category_id),
    ]:
        if value:
            statement = statement.where(
                column.in_(select(model.id).where(model.name == value))
            )
    if assigneeDepartment:
        statement = statement.where(
            m.Ticket.assignee_id.in_(
                select(m.User.id)
                .join(m.Department)
                .where(m.Department.name == assigneeDepartment)
            )
        )
    if status:
        statement = statement.where(m.Ticket.status == status)
    if priority:
        statement = statement.where(m.Ticket.priority == priority)
    if overdue:
        statement = statement.where(
            m.Ticket.status.not_in(TERMINAL), m.Ticket.due_at < services.now()
        )
    if cluster:
        statement = statement.where(
            m.Ticket.id.in_(
                select(m.TicketCluster.ticket_id).where(
                    m.TicketCluster.cluster_id == cluster
                )
            )
        )
    return statement


@router.get("/tickets")
def list_tickets(
    db: Database,
    user: CurrentUser,
    search: str = "",
    department: str = "",
    category: str = "",
    status: str = "",
    priority: str = "",
    overdue: bool = False,
    cluster: str = "",
    authorDepartment: str = "",
    targetDepartment: str = "",
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    query = filters(
        db,
        select(m.Ticket).where(visible_clause(user)),
        search,
        department,
        category,
        status,
        priority,
        overdue,
        cluster,
        authorDepartment,
        targetDepartment,
    )
    return [
        ticket_view(db, t)
        for t in db.scalars(
            query.order_by(m.Ticket.created_at.desc()).offset(offset).limit(limit)
        )
    ]


@router.post("/tickets", status_code=201)
def create_ticket(data: s.TicketDraft, db: Database, user: CurrentUser):
    ticket = services.create_ticket(db, user, data)
    db.flush()
    db.expire(ticket)
    return ticket_view(db, ticket)


@router.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str, db: Database, user: CurrentUser):
    return ticket_view(db, require_ticket(db, user, ticket_id))


def updated(db, ticket):
    db.flush()
    db.expire(ticket)
    return ticket_view(db, ticket)


@router.post("/tickets/{ticket_id}/status")
def status(ticket_id: str, data: s.StatusChange, db: Database, user: CurrentUser):
    return updated(
        db, services.change_status(db, user, ticket_id, data.status, data.text)
    )


@router.post("/tickets/{ticket_id}/comments")
def comment(ticket_id: str, data: s.TextInput, db: Database, user: CurrentUser):
    return updated(db, services.add_comment(db, user, ticket_id, data.text))


@router.post("/tickets/{ticket_id}/confirm")
def confirm(ticket_id: str, data: s.ConfirmInput, db: Database, user: CurrentUser):
    return updated(db, services.confirm(db, user, ticket_id, data.solved, data.reason))


@router.post("/tickets/{ticket_id}/reassign")
def reassign(ticket_id: str, data: s.ReassignInput, db: Database, user: CurrentUser):
    ticket = require_ticket(db, user, ticket_id, manage=True)
    assignee = db.get(m.User, data.assignee_id)
    if (
        ticket.status in TERMINAL
        or not assignee
        or assignee.role != "Руководитель"
        or assignee.vacation
        or assignee.id == ticket.assignee_id
    ):
        raise DomainError(
            "Выберите другого доступного ответственного для открытого обращения"
        )
    previous = ticket.assignee_id
    ticket.assignee_id = assignee.id
    services.audit(
        db,
        ticket,
        user,
        f"Переназначено: {db.get(m.User, previous).name} → {assignee.name}. {data.reason.strip()}",
        "assignee",
        previous,
        assignee.id,
    )
    services.notify(
        db, assignee.id, ticket, f"{ticket.id}: назначено вам. {data.reason.strip()}"
    )
    services.notify(db, ticket.author_id, ticket, f"{ticket.id}: ответственный изменён")
    return updated(db, ticket)


@router.post("/tickets/{ticket_id}/join")
def join(ticket_id: str, data: s.JoinInput, db: Database, user: CurrentUser):
    if user.role != "Сотрудник":
        raise DomainError("Присоединение доступно сотрудникам", 403)
    ticket = db.get(m.Ticket, ticket_id)
    if not ticket:
        raise DomainError("Обращение не найдено", 404)
    if (
        ticket.status in TERMINAL
        or ticket.author_id == user.id
        or any(p.user_id == user.id for p in ticket.participants)
    ):
        raise DomainError("Обращение завершено или уже есть в вашем списке")
    db.add(
        m.Participant(
            ticket_id=ticket.id,
            user_id=user.id,
            department_id=user.department_id,
            context=data.context.strip(),
            frequency=data.frequency,
            minutes=data.minutes,
        )
    )
    if ticket.type == "Проблема":
        ticket.monthly_cost += services.cost(data.frequency, data.minutes)
    services.audit(db, ticket, user, f"Присоединился: {data.context.strip()}")
    services.notify(
        db, ticket.assignee_id, ticket, f"{ticket.id}: присоединился сотрудник"
    )
    return updated(db, ticket)


@router.get("/routing/preview")
def routing_preview(
    db: Database, user: CurrentUser, category: str, targetDepartment: str
):
    return services.route_preview(db, category, targetDepartment)


@router.put("/admin/routing/{rule_id}")
def save_rule(rule_id: str, data: s.RuleInput, db: Database, user: Admin):
    rule = db.get(m.RoutingRule, rule_id)
    if not rule or rule_id != data.id:
        raise DomainError("Правило не найдено", 404)
    if data.primary_id == data.backup_id or data.resolution_days < data.response_days:
        raise DomainError(
            "Нужны разные ответственные; срок решения не раньше первого ответа", 422
        )
    for key in [data.primary_id, data.backup_id]:
        candidate = db.get(m.User, key)
        if not candidate or candidate.role != "Руководитель":
            raise DomainError("Ответственным должен быть руководитель", 422)
    rule.category_id = (
        services.lookup(db, m.Category, data.category).id if data.category else None
    )
    rule.department_id = (
        services.lookup(db, m.Department, data.department).id
        if data.department
        else None
    )
    rule.scope_key = f"{rule.category_id or '*'}:{rule.department_id or '*'}"
    rule.primary_id, rule.backup_id = data.primary_id, data.backup_id
    rule.response_days, rule.resolution_days = data.response_days, data.resolution_days
    return {"message": "Правило сохранено"}


@router.put("/admin/users/{user_id}/vacation")
def vacation(user_id: str, data: s.VacationInput, db: Database, user: Admin):
    target = db.get(m.User, user_id)
    if not target:
        raise DomainError("Пользователь не найден", 404)
    target.vacation = data.vacation
    return user_view(target)


@router.post("/admin/reset-demo")
def reset(db: Database, user: Admin):
    from .seed import load_seed

    return {"count": load_seed(db, reset=True)}


@router.post("/admin/run-sla-check")
def check(user: Admin):
    from .sla import run_check

    return run_check()


@router.get("/admin/aggregates")
def aggregates(db: Database, user: Admin):
    return {
        "tickets": db.scalar(select(func.count(m.Ticket.id))),
        "notifications": db.scalar(select(func.count(m.Notification.id))),
    }


@router.get("/notifications")
def notifications(db: Database, user: CurrentUser):
    rows = db.scalars(
        select(m.Notification)
        .where(m.Notification.user_id == user.id)
        .order_by(m.Notification.created_at.desc())
        .limit(100)
    ).all()
    return [
        {
            "id": n.id,
            "ticketId": n.ticket_id,
            "text": n.text,
            "date": iso(n.created_at),
            "read": n.read,
        }
        for n in rows
    ]


@router.post("/notifications/{notification_id}/read")
def mark_read(notification_id: str, db: Database, user: CurrentUser):
    item = db.get(m.Notification, notification_id)
    if not item or item.user_id != user.id:
        raise DomainError("Уведомление недоступно", 403)
    item.read = True
    return {"message": "Прочитано"}


@router.get("/notifications/unread-count")
def unread_count(db: Database, user: CurrentUser):
    return (
        db.scalar(
            select(func.count(m.Notification.id)).where(
                m.Notification.user_id == user.id, m.Notification.read.is_(False)
            )
        )
        or 0
    )


@router.post("/attachments", status_code=201)
async def upload(db: Database, user: CurrentUser, file: Annotated[UploadFile, File()]):
    if user.role != "Сотрудник":
        raise DomainError("Загрузка доступна автору обращения", 403)
    filename = Path((file.filename or "file").replace("\\", "/")).name[:255]
    key, size = await storage().save(file)
    item = m.Attachment(uploader_id=user.id, name=filename, key=key, size=size)
    db.add(item)
    db.flush()
    return attachment_view(item)


@router.get("/attachments/{attachment_id}")
def download(attachment_id: str, db: Database, user: CurrentUser):
    item = db.get(m.Attachment, attachment_id)
    if not item:
        raise DomainError("Вложение не найдено", 404)
    if item.ticket_id:
        require_ticket(db, user, item.ticket_id)
    elif item.uploader_id != user.id or user.role == "Администратор":
        raise DomainError("Вложение недоступно", 403)
    source = storage().open(item.key)

    def chunks():
        try:
            while chunk := source.read(64 * 1024):
                yield chunk
        finally:
            source.close()

    return StreamingResponse(
        chunks(),
        media_type="application/octet-stream",
        headers={
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": "attachment; filename*=UTF-8''" + quote(item.name),
        },
    )


@router.post("/ai/similar")
def similar(data: s.SimilarInput, db: Database, user: CurrentUser):
    if user.role == "Администратор":
        raise DomainError("Администратору недоступен поиск по содержимому", 403)
    categories = {c.id: c.name for c in db.scalars(select(m.Category))}
    departments = {d.id: d.name for d in db.scalars(select(m.Department))}
    candidates = [
        {
            "id": t.id,
            "title": t.title,
            "text": t.text,
            "status": t.status,
            "category": categories[t.category_id],
            "targetDepartment": departments[t.target_department_id],
        }
        for t in db.scalars(select(m.Ticket))
    ]
    matches = provider.similar(
        data.text, data.category, data.target_department, candidates
    )
    return [
        {
            **ticket_view(db, db.get(m.Ticket, item["id"]), public=True),
            "matchExplanation": item["matchExplanation"],
        }
        for item in matches
    ]


@router.post("/ai/structure")
def structure(data: s.TextInput, user: CurrentUser):
    if user.role != "Сотрудник":
        raise DomainError("Структуратор доступен сотруднику", 403)
    if len(data.text.strip()) < 20:
        raise DomainError("Для анализа нужно минимум 20 символов", 422)
    return provider.structure(data.text, "", "", [])


@router.post("/tickets/{ticket_id}/draft-response")
def draft(ticket_id: str, data: s.StatusChange, db: Database, user: CurrentUser):
    ticket = require_ticket(db, user, ticket_id, manage=True)
    return {
        "text": provider.draft(
            ticket.title,
            db.get(m.Category, ticket.category_id).name,
            db.get(m.Department, ticket.target_department_id).name,
            [],
            data.status,
        )
    }


@router.get("/improvements")
def improvements(db: Database, user: CurrentUser):
    tickets = db.scalars(
        select(m.Ticket)
        .where(
            m.Ticket.status.in_(["Реализовано", "Закрыто"]),
            m.Ticket.implemented_at.is_not(None),
            m.Ticket.changed != "",
        )
        .order_by(m.Ticket.implemented_at.desc())
    )
    return [{**ticket_view(db, t, public=True), "text": t.text} for t in tickets]


@router.get("/analytics")
def get_analytics(
    db: Database, user: CurrentUser, days: int = Query(90, ge=0, le=3650)
):
    return analytics.summary(db, user, days)


@router.get("/analytics/tickets")
def analytics_tickets(
    db: Database,
    user: CurrentUser,
    days: int = Query(90, ge=0, le=3650),
    cluster: str = "",
    authorDepartment: str = "",
    targetDepartment: str = "",
    assigneeDepartment: str = "",
    overdue: bool = False,
    type: str = "",
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    query = filters(
        db,
        select(m.Ticket).where(*analytics.conditions(user, days)),
        cluster=cluster,
        authorDepartment=authorDepartment,
        targetDepartment=targetDepartment,
        assigneeDepartment=assigneeDepartment,
        overdue=overdue,
    )
    if type:
        query = query.where(m.Ticket.type == type)
    return [
        ticket_view(db, t, public=True)
        for t in db.scalars(
            query.order_by(m.Ticket.created_at.desc()).offset(offset).limit(limit)
        )
    ]


@router.get("/analytics/export.xlsx")
def export(db: Database, user: CurrentUser, days: int = Query(90, ge=0, le=3650)):
    return StreamingResponse(
        analytics.registry(db, user, days),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="signal-register.xlsx"'},
    )
