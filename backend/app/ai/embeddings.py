"""Локальные эмбеддинги обращений: смысловой поиск и группировка без внешних сервисов.

Модель работает на CPU через ONNX (fastembed). Веса (~220 МБ) скачиваются при первом
запуске в `backend/models/`. Если весов или сети нет, `embedder.ready` остаётся False,
и сервер продолжает работать на детерминированном `RuleBasedProvider`.

Векторы хранятся в таблице `ticket_embeddings` (float32, нормированы на единичную
длину), поэтому косинусная близость — это скалярное произведение. При переходе на
PostgreSQL таблицу можно заменить колонкой pgvector без изменения вызывающего кода.
"""

from __future__ import annotations

import hashlib
import logging
import threading
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import Ticket, TicketEmbedding

if TYPE_CHECKING:
    import numpy as np

log = logging.getLogger("signal.ai")


class Embedder:
    """Ленивая обёртка над моделью: загрузка весов не блокирует старт API."""

    def __init__(self) -> None:
        self._model = None
        self._lock = threading.Lock()
        self.failed = False

    @property
    def name(self) -> str:
        return settings().embedding_model

    @property
    def ready(self) -> bool:
        return self._model is not None

    def load(self) -> bool:
        if self._model is not None or self.failed:
            return self.ready
        with self._lock:
            if self._model is not None or self.failed:
                return self.ready
            try:
                from fastembed import TextEmbedding

                self._model = TextEmbedding(
                    self.name, cache_dir=str(settings().model_directory)
                )
                log.info("Модель эмбеддингов загружена: %s", self.name)
            except Exception as error:  # нет пакета, весов или сети — работаем без модели
                self.failed = True
                log.warning("Смысловой поиск отключён, используются правила: %s", error)
        return self.ready

    def encode(self, texts: list[str]) -> "np.ndarray":
        import numpy as np

        vectors = np.array(list(self._model.embed(texts)), dtype=np.float32)
        return vectors / np.linalg.norm(vectors, axis=1, keepdims=True)


embedder = Embedder()


def ticket_text(ticket: Ticket) -> str:
    return f"{ticket.title}. {ticket.text}"


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def sync_embeddings(db: Session) -> int:
    """Досчитывает векторы для новых и изменённых обращений. Возвращает их число."""
    if not embedder.load():
        return 0
    stored = {
        row.ticket_id: row
        for row in db.scalars(
            select(TicketEmbedding).where(TicketEmbedding.model == embedder.name)
        )
    }
    pending = []
    for ticket in db.scalars(select(Ticket)):
        digest = text_hash(ticket_text(ticket))
        row = stored.get(ticket.id)
        if row is None or row.text_hash != digest:
            pending.append((ticket, digest, row))
    if not pending:
        return 0
    vectors = embedder.encode([ticket_text(ticket) for ticket, _, _ in pending])
    for (ticket, digest, row), vector in zip(pending, vectors):
        if row is None:
            row = TicketEmbedding(ticket_id=ticket.id, model=embedder.name)
            db.add(row)
        row.text_hash, row.vector = digest, vector.tobytes()
    db.flush()
    return len(pending)


def load_vectors(db: Session) -> dict[str, "np.ndarray"]:
    """Векторы всех обращений текущей модели; пустой словарь, если модель недоступна."""
    if not embedder.ready:
        return {}
    import numpy as np

    return {
        row.ticket_id: np.frombuffer(row.vector, dtype=np.float32)
        for row in db.scalars(
            select(TicketEmbedding).where(TicketEmbedding.model == embedder.name)
        )
    }


def nearest_cluster(
    vector: "np.ndarray",
    members: dict[str, list["np.ndarray"]],
    threshold: float,
) -> tuple[str, float]:
    """Кластер с ближайшим центроидом. Пустая строка, если близость ниже порога."""
    import numpy as np

    best, best_score = "", threshold
    for cluster_id, vectors in members.items():
        centroid = np.mean(vectors, axis=0)
        score = float(vector @ (centroid / np.linalg.norm(centroid)))
        if score >= best_score:
            best, best_score = cluster_id, score
    return best, best_score


def group_similar(
    vectors: dict[str, "np.ndarray"], threshold: float, min_size: int = 2
) -> list[list[str]]:
    """Связные группы обращений, где каждое близко хотя бы к одному другому."""
    ids = list(vectors)
    parent = {i: i for i in ids}

    def find(item: str) -> str:
        while parent[item] != item:
            parent[item] = parent[parent[item]]
            item = parent[item]
        return item

    for index, left in enumerate(ids):
        for right in ids[index + 1 :]:
            if float(vectors[left] @ vectors[right]) >= threshold:
                parent[find(left)] = find(right)
    groups: dict[str, list[str]] = {}
    for item in ids:
        groups.setdefault(find(item), []).append(item)
    return sorted(
        (group for group in groups.values() if len(group) >= min_size),
        key=len,
        reverse=True,
    )
