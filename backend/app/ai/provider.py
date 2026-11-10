import json
import math
import re
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Cluster, Ticket
from ..services import make_title


class AIProvider(Protocol):
    def similar(
        self, text: str, category: str, department: str, candidates: list[dict]
    ) -> list[dict]: ...
    def structure(
        self, text: str, category: str, department: str, candidates: list[dict]
    ) -> dict: ...
    def draft(
        self,
        text: str,
        category: str,
        department: str,
        candidates: list[dict],
        status: str,
    ) -> str: ...


STOP = set(
    "а без бы был была были было быть в вам вас во все для до его ее если есть еще за и из или их к как когда кто мы на нам нас не нет ни но нужно нужна нужен о об от по под после при про раз с со так то только у уже что чтобы это этот я иногда часто несколько каждый можно предлагаю приходится".split()
)
ROOTS = [
    (r"^заяв(?:к|ок)", "заявк", "заявка"),
    (r"^назнач", "назначен", "назначение"),
    (r"^парамет", "параметр", "параметры"),
    (r"^закуп", "закупк", "закупка"),
    (r"^уточн", "уточнен", "уточнение"),
    (r"^проектиров", "проектировщик", "проектировщик"),
    (r"^номенклат", "номенклатур", "номенклатура"),
    (r"^обознач", "обозначен", "обозначение"),
    (r"^спецификац", "спецификаци", "спецификация"),
    (r"^согласован", "согласован", "согласование"),
    (r"^документ", "документ", "документы"),
    (r"^повторн", "повторн", "повторный"),
]
ENDING = re.compile(
    r"(?:иями|ями|ами|ого|его|ому|ему|ыми|ими|ение|ения|ов|ев|ий|ый|ой|ая|яя|ое|ее|ые|ие|ую|юю|ах|ях|ом|ем|ам|ям|ы|и|а|я|у|ю|е|о)$"
)


def words(text: str) -> list[str]:
    return [
        w
        for w in re.findall(r"[а-яa-z0-9]+", text.lower().replace("ё", "е"))
        if len(w) >= 3 and w not in STOP
    ]


def stem(word: str) -> str:
    return next(
        (root for pattern, root, _ in ROOTS if re.match(pattern, word)),
        ENDING.sub("", word) if len(word) > 4 else word,
    )


class RuleBasedProvider:
    def similar(
        self, text: str, category: str, department: str, candidates: list[dict]
    ) -> list[dict]:
        terms = set(map(stem, words(text)))
        docs = [
            (t, set(map(stem, words(t["title"]))), set(map(stem, words(t["text"]))))
            for t in candidates
        ]
        idf = {
            term: 1
            + math.log(
                (len(docs) + 1) / (1 + sum(term in a or term in b for _, a, b in docs))
            )
            for term in terms
        }
        scored = []
        for ticket, title, body in docs:
            matches = terms & (title | body)
            if len(matches) < 2 or ticket["status"] in {
                "Реализовано",
                "Отклонено",
                "Закрыто",
            }:
                continue
            score = sum(
                idf[w] * (3 * (w in title) + (w in body)) for w in matches
            ) / math.sqrt(max(8, len(title) + len(body)))
            score += 1.6 * (category == ticket["category"]) + 1.1 * (
                department == ticket["targetDepartment"]
            )
            explanations = []
            for term in sorted(matches, key=lambda w: (-idf[w], w))[:3]:
                explanations.append(
                    next(
                        (label for _, root, label in ROOTS if root == term),
                        next((w for w in words(text) if stem(w) == term), term),
                    )
                )
            scored.append(
                {
                    "id": ticket["id"],
                    "score": score,
                    "matchExplanation": "Совпадение: " + ", ".join(explanations),
                }
            )
        return sorted(scored, key=lambda t: (-t["score"], t["id"]))[:4]

    def detect_cluster(self, db: Session, text: str) -> str:
        clusters = db.scalars(select(Cluster)).all()
        scores = [
            (sum(word in text.lower() for word in json.loads(c.keywords)), c.id)
            for c in clusters
        ]
        return max(scores)[1] if scores and max(scores)[0] else ""

    def structure(
        self, text: str, category: str, department: str, candidates: list[dict]
    ) -> dict:
        from ..config import settings

        seed = json.loads(settings().seed_path.read_text(encoding="utf-8"))
        scored = [
            (sum(w in text.lower() for w in c["keywords"]), c["id"])
            for c in seed["clusters"]
        ]
        cluster = max(scored)[1] if scored and max(scored)[0] else ""
        categories = {
            "purchase": "Заявки и взаимодействие",
            "catalog": "Каталог и спецификации",
            "documents": "Документы и согласования",
            "decisions": "Процессы и коммуникации",
            "systems": "IT и обмен данными",
            "knowledge": "Обучение и ПНР",
        }
        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        solutions = [
            s for s in sentences if re.search("предлага|нужн|можно|хотелось", s, re.I)
        ]
        return {
            "title": make_title(text),
            "problem": " ".join(s for s in sentences if s not in solutions)
            or sentences[0],
            "solution": " ".join(solutions)
            or "Согласовать порядок работы и назначить владельца процесса.",
            "effect": "Сократить уточнения и время передачи работы между подразделениями.",
            "category": categories.get(cluster, category or "Корпоративная среда"),
            "priority": "Высокий"
            if re.search("сроч|срыв|теря|ошиб|повторн", text, re.I)
            else "Средний",
        }

    def draft(
        self,
        text: str,
        category: str,
        department: str,
        candidates: list[dict],
        status: str,
    ) -> str:
        if status == "Ожидает уточнения":
            return f"Спасибо за обращение «{text}». Уточните этап, частоту повторения и приложите обезличенный пример."
        if status == "Отклонено":
            return "Спасибо за предложение. Сейчас реализация ограничена доступными ресурсами. Уточним условия повторного рассмотрения."
        if status == "Реализовано":
            return f"По обращению «{text}» согласован порядок работы и назначен владелец процесса. Опишите конкретный результат и проверьте его с автором."
        return f"Обращение «{text}» принято в работу. Проверим ситуацию и зафиксируем результат в карточке."


provider: AIProvider = RuleBasedProvider()
