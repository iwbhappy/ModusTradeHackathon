import argparse
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from . import models as m
from .config import settings
from .db import Base, SessionLocal, now
from .domain.audit_chain import seal
from .domain.calendar import calendar
from .services import cost


def load_seed(db: Session, reset: bool = False) -> int:
    if db.scalar(select(m.User.id).limit(1)) and not reset:
        return 0
    if reset:
        for table in reversed(Base.metadata.sorted_tables):
            # Сброс демонстрации не должен обнулять расходы и обходить лимит LLM.
            if table.name in {"llm_cache", "llm_usage"}:
                continue
            db.execute(delete(table))
        db.flush()
        db.expunge_all()
    data = json.loads(settings().seed_path.read_text(encoding="utf-8"))
    cal = calendar()
    anchor = cal.local(now())
    if anchor.hour < 17:
        anchor -= timedelta(days=1)
    while not cal.is_workday(anchor.date()):
        anchor -= timedelta(days=1)
    anchor = anchor.replace(hour=17, minute=0, second=0, microsecond=0)
    anchor = anchor.astimezone(timezone.utc).replace(tzinfo=None)

    def date(value):
        return anchor + timedelta(days=value["offsetDays"]) if value else None

    departments = {d["name"]: d["id"] for d in data["departments"]}
    categories = {c["name"]: c["id"] for c in data["categories"]}
    for row in data["departments"]:
        db.add(m.Department(id=row["id"], name=row["name"], head_id=row["headId"]))
    for row in data["categories"]:
        db.add(m.Category(**row))
    db.flush()
    for row in data["users"]:
        db.add(
            m.User(
                id=row["id"],
                name=row["name"],
                role=row["role"],
                department_id=departments[row["department"]],
                vacation=row["vacation"],
                is_department_head=row["isDepartmentHead"],
                can_view_company_analytics=row["canViewCompanyAnalytics"],
            )
        )
    db.flush()
    for row in data["users"]:
        db.get(m.User, row["id"]).supervisor_id = row.get("supervisorId")
    for row in data["rules"]:
        cat, dep = categories.get(row["category"]), departments.get(row["department"])
        db.add(
            m.RoutingRule(
                id=row["id"],
                category_id=cat,
                department_id=dep,
                scope_key=f"{cat or '*'}:{dep or '*'}",
                primary_id=row["primaryId"],
                backup_id=row["backupId"],
                response_days=row["responseDays"],
                resolution_days=row["resolutionDays"],
            )
        )
    for row in data["clusters"]:
        db.add(
            m.Cluster(
                id=row["id"],
                title=row["title"],
                keywords=json.dumps(row["keywords"], ensure_ascii=False),
            )
        )
    db.flush()
    names = {row["name"]: row["id"] for row in data["users"]}
    rules = {row["category"]: row for row in data["rules"]}
    for row in data["tickets"]:
        created = date(row["createdAt"])
        first = date(row.get("firstResponseAt"))
        rule = rules[row["category"]]
        ticket = m.Ticket(
            id=row["id"],
            title=row["title"],
            text=row["text"],
            type=row["type"],
            category_id=categories[row["category"]],
            original_category=row["originalCategory"],
            author_id=row["authorId"],
            author_department_id=departments[row["authorDepartment"]],
            target_department_id=departments[row["targetDepartment"]],
            assignee_id=row["assigneeId"],
            priority=row["priority"],
            status=row["status"],
            created_at=created,
            response_due_at=cal.add_days(created, rule["responseDays"]),
            due_at=date(row["dueAt"])
            if row["status"] == "Возвращено автором"
            else cal.add_days(created, rule["resolutionDays"]),
            first_response_at=first,
            first_response_hours=cal.hours_between(created, first) if first else None,
            implemented_at=date(row.get("implementedAt")),
            closed_at=date(row.get("closedAt")),
            confirmed=row["confirmed"],
            default_confirmed=False,
            escalated=False,
            frequency=row["frequency"],
            minutes=row["minutes"],
            solution=row["solution"],
            effect=row["effect"],
            changed=row["changed"],
            rejection=row["rejection"],
            monthly_cost=(
                cost(row["frequency"], row["minutes"])
                + sum(cost(p["frequency"], p["minutes"]) for p in row["participants"])
            )
            if row["type"] == "Проблема"
            else 0,
        )
        db.add(ticket)
        db.flush()
        for participant in row["participants"]:
            db.add(
                m.Participant(
                    ticket_id=ticket.id,
                    user_id=participant["userId"],
                    department_id=departments[participant["department"]],
                    context=participant["context"],
                    frequency=participant["frequency"],
                    minutes=participant["minutes"],
                )
            )
        for comment in row["comments"]:
            db.add(
                m.Comment(
                    id=comment["id"],
                    ticket_id=ticket.id,
                    author_id=names[comment["author"]],
                    date=date(comment["date"]),
                    text=comment["text"],
                )
            )
        old_status, previous_event = None, None
        for event in sorted(row["events"], key=lambda e: e["date"]["offsetDays"]):
            status = event.get("status")
            item = m.TicketEvent(
                id=event["id"],
                ticket_id=ticket.id,
                actor_id=names.get(event["actor"]),
                date=date(event["date"]),
                text=event["text"],
                field="status" if status else None,
                old_value=old_status if status else None,
                new_value=status,
            )
            seal(item, previous_event)
            db.add(item)
            previous_event = item
            old_status = status or old_status
        if row["clusterId"]:
            db.add(m.TicketCluster(ticket_id=ticket.id, cluster_id=row["clusterId"]))
    db.flush()
    return len(data["tickets"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Загрузка единого демо-набора Сигнала")
    parser.add_argument("--reset", action="store_true")
    args = parser.parse_args()
    with SessionLocal() as db:
        count = load_seed(db, args.reset)
        db.commit()
    print(f"Загружено обращений: {count}")
