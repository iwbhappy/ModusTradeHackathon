"""Журнал обращения, защищённый от правок задним числом.

Каждое событие хранит порядковый номер, подпись предыдущего события и собственную
подпись — HMAC-SHA256 от содержимого и подписи предшественника. Изменить, удалить
или переставить запись, не нарушив цепочку, можно только зная ключ сервера
(`AUDIT_KEY`), которого нет в базе данных. Поэтому правка напрямую в БД обнаруживается.
"""

import hashlib
import hmac
import json
from collections.abc import Sequence

from ..config import settings
from ..models import TicketEvent

GENESIS = "0" * 64


def sign(event: TicketEvent, prev_hash: str) -> str:
    payload = json.dumps(
        [
            event.ticket_id,
            event.seq,
            event.actor_id,
            event.date.isoformat(),
            event.text,
            event.field,
            event.old_value,
            event.new_value,
            prev_hash,
        ],
        ensure_ascii=False,
        separators=(",", ":"),
    )
    key = settings().audit_key.encode("utf-8")
    return hmac.new(key, payload.encode("utf-8"), hashlib.sha256).hexdigest()


def seal(event: TicketEvent, previous: TicketEvent | None) -> None:
    """Ставит новое событие в конец цепочки."""
    event.seq = previous.seq + 1 if previous else 1
    event.prev_hash = previous.hash if previous else GENESIS
    event.hash = sign(event, event.prev_hash)


def verify(events: Sequence[TicketEvent]) -> dict:
    """Проверяет цепочку. `brokenAt` — номер первой записи, где она нарушена."""
    ordered = sorted(events, key=lambda e: e.seq)
    prev_hash, broken_at = GENESIS, None
    for position, event in enumerate(ordered, start=1):
        intact = (
            event.seq == position
            and event.prev_hash == prev_hash
            and hmac.compare_digest(event.hash, sign(event, prev_hash))
        )
        if not intact:
            broken_at = position
            break
        prev_hash = event.hash
    return {
        "valid": broken_at is None,
        "count": len(ordered),
        "brokenAt": broken_at,
        "lastHash": ordered[-1].hash if ordered and broken_at is None else "",
    }
