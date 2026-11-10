from .errors import DomainError

NEW = "Новое"
REVIEW = "На рассмотрении"
CLARIFY = "Ожидает уточнения"
WORK = "В работе"
DONE = "Реализовано"
REJECT = "Отклонено"
CLOSED = "Закрыто"
RETURNED = "Возвращено автором"
STATUSES = [NEW, REVIEW, CLARIFY, WORK, DONE, REJECT, CLOSED, RETURNED]
TERMINAL = [DONE, REJECT, CLOSED]
TRANSITIONS = {
    NEW: {REVIEW, WORK, CLARIFY, REJECT},
    REVIEW: {WORK, CLARIFY, REJECT, DONE},
    CLARIFY: {REVIEW, WORK, REJECT},
    WORK: {CLARIFY, DONE, REJECT},
    RETURNED: {REVIEW, WORK, CLARIFY, REJECT},
    DONE: {CLOSED, RETURNED},
    REJECT: set(),
    CLOSED: set(),
}


def validate_transition(old: str, new: str, actor: str, text: str = "") -> None:
    if new not in TRANSITIONS.get(old, set()):
        raise DomainError(f"Переход «{old} → {new}» недопустим")
    if old == DONE:
        if actor not in {"author", "system"} or (actor == "system" and new != CLOSED):
            raise DomainError("Только автор может подтвердить решение или вернуть его")
    elif actor == "author" and old == CLARIFY and new == REVIEW:
        pass
    elif actor != "manager":
        raise DomainError("Действие доступно ответственному")
    if new in {CLARIFY, REJECT, DONE, RETURNED} and len(text.strip()) < 10:
        labels = {
            CLARIFY: "текст запроса уточнения",
            REJECT: "мотивировку отказа",
            DONE: "что изменилось",
            RETURNED: "что осталось нерешённым",
        }
        raise DomainError(f"Укажите {labels[new]}: минимум 10 символов")
