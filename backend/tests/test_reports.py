from datetime import date, datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db import Base
from app.models import Category, Cluster, Department, Ticket, TicketCluster, User
from app.reports import period_report


def test_period_report_groups_activity_and_compares_equal_previous_period():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add(Department(id="d", name="Проектирование"))
        db.add(Category(id="c", name="Каталог"))
        db.add(Cluster(id="repeat", title="Единые обозначения", keywords="[]"))
        db.add_all(
            [
                User(
                    id="admin",
                    name="Администратор",
                    role="Администратор",
                    department_id="d",
                ),
                User(
                    id="author", name="Сотрудник", role="Сотрудник", department_id="d"
                ),
                User(
                    id="manager",
                    name="Ответственный",
                    role="Руководитель",
                    department_id="d",
                ),
            ]
        )
        db.flush()

        def ticket(ticket_id, created, **extra):
            return Ticket(
                id=ticket_id,
                title=ticket_id,
                text="Текст не должен попадать в отчёт",
                type="Проблема",
                category_id="c",
                author_id="author",
                author_department_id="d",
                target_department_id="d",
                assignee_id="manager",
                status="Новое",
                priority="Средний",
                created_at=created,
                response_due_at=datetime(2026, 11, 20, 12),
                due_at=datetime(2026, 11, 25, 12),
                **extra
            )

        incoming = ticket("new", datetime(2026, 11, 2, 12), monthly_cost=5)
        result = ticket("result", datetime(2026, 10, 20, 12), monthly_cost=20)
        result.status, result.changed = (
            "Закрыто",
            "Объединили карточки оборудования. Убрали дубли.",
        )
        result.implemented_at, result.closed_at, result.confirmed = (
            datetime(2026, 11, 4, 12),
            datetime(2026, 11, 6, 12),
            True,
        )
        rejected = ticket("rejected", datetime(2026, 11, 3, 12), monthly_cost=4)
        rejected.status, rejected.rejection, rejected.closed_at = (
            "Отклонено",
            "Изменение противоречит требованиям безопасности.",
            datetime(2026, 11, 5, 12),
        )
        previous = ticket("previous", datetime(2026, 10, 27, 12), monthly_cost=10)
        previous.status, previous.changed = "Закрыто", "Опубликован справочник."
        previous.implemented_at, previous.closed_at, previous.confirmed = (
            datetime(2026, 10, 30, 12),
            datetime(2026, 10, 31, 12),
            True,
        )
        db.add_all([incoming, result, rejected, previous])
        db.flush()
        db.add_all(
            [
                TicketCluster(ticket_id="new", cluster_id="repeat"),
                TicketCluster(ticket_id="result", cluster_id="repeat"),
            ]
        )
        db.flush()
        report = period_report(
            db, db.get(User, "admin"), date(2026, 11, 1), date(2026, 11, 7)
        )
        assert (
            report["previousFrom"] == "2026-10-25"
            and report["previousTo"] == "2026-10-31"
        )
        assert report["metrics"]["incoming"] == {
            "value": 2,
            "previous": 1,
            "delta": 1,
            "percent": 100.0,
        }
        assert (
            report["metrics"]["resolved"]["value"] == 2
            and report["metrics"]["resolved"]["delta"] == 1
        )
        assert report["metrics"]["confirmed"]["delta"] == 0
        assert (
            report["metrics"]["savedHours"]["value"] == 20
            and report["metrics"]["savedHours"]["delta"] == 10
        )
        assert [g["id"] for g in report["groups"]] == ["cluster:repeat", "category:c"]
        group = report["groups"][0]
        assert group["counts"]["incoming"] == 1 and group["counts"]["implemented"] == 1
        assert {item["id"] for item in group["tickets"]} == {"new", "result"}
        assert "Объединили карточки" in group["brief"]
        assert all(
            "text" not in item for g in report["groups"] for item in g["tickets"]
        )
    engine.dispose()
