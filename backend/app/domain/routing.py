from dataclasses import dataclass
from collections.abc import Sequence
from ..models import RoutingRule, User
from .errors import DomainError


@dataclass
class Assignment:
    user: User
    rule: RoutingRule | None
    fallback: bool
    reason: str


def choose_assignment(
    category_id: str,
    department_id: str,
    rules: Sequence[RoutingRule],
    users: Sequence[User],
    head_id: str | None,
    direction_id: str,
) -> Assignment:
    rule = next(
        (
            r
            for r in rules
            if r.category_id == category_id and r.department_id == department_id
        ),
        None,
    )
    rule = rule or next(
        (r for r in rules if r.category_id == category_id and r.department_id is None),
        None,
    )
    rule = rule or next(
        (r for r in rules if r.category_id is None and r.department_id is None), None
    )
    by_id = {u.id: u for u in users if u.role == "Руководитель"}
    if rule:
        primary, backup = by_id.get(rule.primary_id), by_id.get(rule.backup_id)
        if primary and not primary.vacation:
            return Assignment(
                primary, rule, False, "Назначено по правилу маршрутизации"
            )
        if backup and not backup.vacation:
            return Assignment(
                backup,
                rule,
                True,
                "Основной ответственный в отпуске; назначен резервный",
            )
    head = by_id.get(head_id)
    direction = by_id.get(direction_id)
    fallback = head if head and not head.vacation else direction or head
    fallback = fallback or next(iter(by_id.values()), None)
    if not fallback:
        raise DomainError("В оргструктуре отсутствует руководитель для назначения", 503)
    return Assignment(
        fallback, rule, True, "Назначено по резервному правилу: руководителю"
    )
