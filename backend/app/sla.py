import asyncio
import logging
import threading

from sqlalchemy import select
from . import models as m
from .db import SessionLocal, now
from .domain.calendar import calendar
from .domain.workflow import validate_transition, DONE, CLOSED, TERMINAL
from .services import audit, notify

lock = threading.Lock()


def run_check() -> dict:
    if not lock.acquire(blocking=False):
        return {"processed": 0, "message": "Проверка уже выполняется"}
    processed = 0
    try:
        with SessionLocal() as db:
            cal, timestamp = calendar(), now()
            tickets = db.scalars(
                select(m.Ticket).where(m.Ticket.status.not_in(["Закрыто", "Отклонено"]))
            ).all()
            direction = db.scalar(
                select(m.User).where(m.User.can_view_company_analytics.is_(True))
            )
            for ticket in tickets:
                cycle = f"{ticket.id}:{ticket.due_at.isoformat()}"
                if ticket.status == DONE:
                    if ticket.implemented_at and timestamp >= cal.add_days(
                        ticket.implemented_at, 5
                    ):
                        validate_transition(DONE, CLOSED, "system")
                        ticket.status, ticket.closed_at = CLOSED, timestamp
                        ticket.default_confirmed, ticket.confirmed = True, False
                        audit(
                            db,
                            ticket,
                            None,
                            "Подтверждено по умолчанию: автор не ответил за 5 рабочих дней",
                            "status",
                            DONE,
                            CLOSED,
                        )
                        notify(
                            db,
                            ticket.author_id,
                            ticket,
                            f"{ticket.id}: закрыто, подтверждено по умолчанию",
                        )
                        processed += 1
                    continue
                if ticket.status in TERMINAL:
                    continue
                for label, due in [
                    ("response", ticket.response_due_at),
                    ("resolution", ticket.due_at),
                ]:
                    if label == "response" and ticket.first_response_at:
                        continue
                    if cal.add_days(due, -1) <= timestamp < due:
                        notify(
                            db,
                            ticket.assignee_id,
                            ticket,
                            f"{ticket.id}: до срока {'ответа' if label == 'response' else 'решения'} один рабочий день",
                            f"reminder:{label}:{cycle}:{due.isoformat()}",
                        )
                if not ticket.first_response_at and timestamp > ticket.response_due_at:
                    dedup = f"response-overdue:{ticket.id}:{ticket.response_due_at.isoformat()}"
                    if not db.scalar(
                        select(m.Notification.id).where(
                            m.Notification.dedup_key == dedup
                        )
                    ):
                        head = db.get(
                            m.Department, ticket.assignee.department_id
                        ).head_id
                        notify(
                            db,
                            head or direction.id,
                            ticket,
                            f"{ticket.id}: просрочен первый ответ",
                            dedup,
                        )
                        audit(
                            db,
                            ticket,
                            None,
                            "Просрочен первый ответ. Руководитель подразделения уведомлён",
                        )
                        processed += 1
                if timestamp > cal.add_days(ticket.due_at, 3) and not ticket.escalated:
                    ticket.escalated = True
                    audit(
                        db,
                        ticket,
                        None,
                        "Эскалировано руководителю направления: решение просрочено более чем на 3 рабочих дня",
                        "escalated",
                        "false",
                        "true",
                    )
                    notify(
                        db,
                        direction.id if direction else ticket.assignee_id,
                        ticket,
                        f"{ticket.id}: эскалация просроченного решения",
                        f"escalation:{cycle}",
                    )
                    processed += 1
            db.commit()
        return {"processed": processed, "message": "Проверка SLA завершена"}
    finally:
        lock.release()


async def scheduler(interval: int):
    while True:
        await asyncio.sleep(max(5, interval))
        try:
            await asyncio.to_thread(run_check)
        except Exception:
            logging.getLogger("signal.sla").exception("Ошибка фоновой проверки SLA")
