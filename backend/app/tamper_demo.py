"""Демонстрация защиты журнала: правим запись в обход приложения.

    uv run python -m app.tamper_demo A-009

Скрипт меняет текст первого события обращения прямым запросом к базе — так, как это
сделал бы человек с доступом к БД. Подпись при этом не пересчитывается, и карточка
обращения показывает нарушение целостности журнала. Вернуть данные: сброс демо.
"""

import sys

from sqlalchemy import select, update

from .db import SessionLocal
from .domain.audit_chain import verify
from .models import TicketEvent


def main(ticket_id: str) -> None:
    with SessionLocal() as db:
        events = db.scalars(
            select(TicketEvent)
            .where(TicketEvent.ticket_id == ticket_id)
            .order_by(TicketEvent.seq)
        ).all()
        if not events:
            sys.exit(f"У обращения {ticket_id} нет событий")
        db.execute(
            update(TicketEvent)
            .where(TicketEvent.id == events[0].id)
            .values(text=events[0].text + " (изменено задним числом)")
        )
        db.commit()
        db.expire_all()
        result = verify(
            db.scalars(
                select(TicketEvent).where(TicketEvent.ticket_id == ticket_id)
            ).all()
        )
    print(f"Запись изменена в обход приложения. Проверка журнала: {result}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "A-009")
