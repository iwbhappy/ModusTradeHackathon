from datetime import date, datetime

import pytest

from app.domain.calendar import BusinessCalendar
from app.domain.errors import DomainError
from app.domain.permissions import can_read
from app.domain.routing import choose_assignment
from app.domain.workflow import validate_transition
from app.models import Participant, RoutingRule, Ticket, User


def test_cannot_close_new_ticket():
    with pytest.raises(DomainError, match="недопустим") as error:
        validate_transition("Новое", "Закрыто", "manager")
    assert error.value.status == 409


def test_rejection_requires_reason():
    with pytest.raises(DomainError, match="мотивировку"):
        validate_transition("На рассмотрении", "Отклонено", "manager", " ")


def test_implementation_requires_result():
    with pytest.raises(DomainError, match="что изменилось"):
        validate_transition("В работе", "Реализовано", "manager", "Готово")


def test_clarification_requires_question():
    with pytest.raises(DomainError, match="текст запроса"):
        validate_transition("В работе", "Ожидает уточнения", "manager", "")


def test_manager_cannot_confirm_for_author():
    with pytest.raises(DomainError, match="Только автор"):
        validate_transition("Реализовано", "Закрыто", "manager")


def test_employee_cannot_read_other_ticket():
    employee = User(id="employee", role="Сотрудник")
    ticket = Ticket(author_id="other", participants=[])
    assert can_read(employee, ticket) is False


def test_admin_cannot_read_even_own_assignment():
    admin = User(id="admin", role="Администратор")
    ticket = Ticket(author_id="admin", assignee_id="admin", participants=[])
    assert can_read(admin, ticket) is False


def test_joined_employee_can_read_ticket():
    employee = User(id="employee", role="Сотрудник")
    ticket = Ticket(author_id="other", participants=[Participant(user_id="employee")])
    assert can_read(employee, ticket) is True


def test_vacation_routes_to_backup():
    primary = User(id="primary", role="Руководитель", vacation=True)
    backup = User(id="backup", role="Руководитель", vacation=False)
    rule = RoutingRule(
        category_id="category",
        department_id=None,
        primary_id="primary",
        backup_id="backup",
    )
    selected = choose_assignment(
        "category", "department", [rule], [primary, backup], None, "backup"
    )
    assert selected.user.id == "backup"
    assert selected.fallback is True


def test_both_absent_still_assigns_department_head():
    primary = User(id="primary", role="Руководитель", vacation=True)
    backup = User(id="backup", role="Руководитель", vacation=True)
    head = User(id="head", role="Руководитель", vacation=False)
    rule = RoutingRule(
        category_id="category",
        department_id=None,
        primary_id="primary",
        backup_id="backup",
    )
    selected = choose_assignment(
        "category", "department", [rule], [primary, backup, head], "head", "head"
    )
    assert selected.user.id == "head"
    assert "резервному правилу" in selected.reason


def test_missing_category_uses_default_rule():
    head = User(id="head", role="Руководитель", vacation=False)
    rule = RoutingRule(
        category_id=None, department_id=None, primary_id="head", backup_id="head"
    )
    selected = choose_assignment(
        "unknown", "department", [rule], [head], "head", "head"
    )
    assert selected.user.id == "head"
    assert selected.rule is rule


def test_business_days_skip_holiday_and_honor_working_saturday():
    calendar = BusinessCalendar(
        {date(2026, 11, 4), date(2027, 2, 22)}, {date(2027, 2, 20)}, "UTC"
    )
    assert calendar.add_days(datetime(2026, 11, 3, 12), 1) == datetime(2026, 11, 5, 12)
    assert calendar.add_days(datetime(2027, 2, 19, 12), 1) == datetime(2027, 2, 20, 12)
    assert (
        calendar.days_between(datetime(2026, 11, 3, 12), datetime(2026, 11, 5, 12)) == 1
    )
