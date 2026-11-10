import logging
from typing import Protocol


class Notifier(Protocol):
    def send(self, user_id: str, text: str) -> None: ...


class LogNotifier:
    def send(self, user_id: str, text: str) -> None:
        logging.getLogger("signal.notifications").info(
            "Канал email/Битрикс24 (имитация), получатель=%s, уведомление=%s",
            user_id,
            text,
        )
