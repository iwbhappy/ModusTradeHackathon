from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base, now


def uid() -> str:
    return str(uuid4())


class Department(Base):
    __tablename__ = "departments"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    head_id: Mapped[str | None] = mapped_column(String(80))


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(40))
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"), index=True)
    vacation: Mapped[bool] = mapped_column(Boolean, default=False)
    is_department_head: Mapped[bool] = mapped_column(Boolean, default=False)
    can_view_company_analytics: Mapped[bool] = mapped_column(Boolean, default=False)
    supervisor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    department: Mapped[Department] = relationship(foreign_keys=[department_id])


class Category(Base):
    __tablename__ = "categories"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)


class RoutingRule(Base):
    __tablename__ = "routing_rules"
    __table_args__ = (UniqueConstraint("scope_key", name="uq_routing_scope"),)
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"))
    department_id: Mapped[str | None] = mapped_column(ForeignKey("departments.id"))
    scope_key: Mapped[str] = mapped_column(String(200))
    primary_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    backup_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    response_days: Mapped[int] = mapped_column(Integer, default=2)
    resolution_days: Mapped[int] = mapped_column(Integer, default=10)


class Ticket(Base):
    __tablename__ = "tickets"
    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=uid)
    title: Mapped[str] = mapped_column(String(200))
    text: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(50))
    category_id: Mapped[str] = mapped_column(ForeignKey("categories.id"), index=True)
    original_category: Mapped[str] = mapped_column(String(120), default="")
    author_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    author_department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"))
    target_department_id: Mapped[str] = mapped_column(
        ForeignKey("departments.id"), index=True
    )
    assignee_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    priority: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(50), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now, index=True)
    response_due_at: Mapped[datetime] = mapped_column(DateTime)
    due_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    first_response_at: Mapped[datetime | None] = mapped_column(DateTime)
    first_response_hours: Mapped[float | None] = mapped_column(Float)
    implemented_at: Mapped[datetime | None] = mapped_column(DateTime)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime)
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    default_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    escalated: Mapped[bool] = mapped_column(Boolean, default=False)
    frequency: Mapped[str] = mapped_column(String(30), default="еженедельно")
    minutes: Mapped[int] = mapped_column(Integer, default=30)
    monthly_cost: Mapped[float] = mapped_column(Float, default=0)
    solution: Mapped[str] = mapped_column(Text, default="")
    effect: Mapped[str] = mapped_column(Text, default="")
    changed: Mapped[str] = mapped_column(Text, default="")
    rejection: Mapped[str] = mapped_column(Text, default="")
    version: Mapped[int] = mapped_column(Integer, default=1)
    __mapper_args__ = {"version_id_col": version}
    assignee: Mapped[User] = relationship(foreign_keys=[assignee_id])
    participants: Mapped[list["Participant"]] = relationship(
        cascade="all, delete-orphan"
    )
    comments: Mapped[list["Comment"]] = relationship(
        cascade="all, delete-orphan", order_by="Comment.date"
    )
    events: Mapped[list["TicketEvent"]] = relationship(
        cascade="all, delete-orphan", order_by="TicketEvent.date"
    )
    attachments: Mapped[list["Attachment"]] = relationship(back_populates="ticket")
    cluster_links: Mapped[list["TicketCluster"]] = relationship(
        cascade="all, delete-orphan"
    )


class Participant(Base):
    __tablename__ = "ticket_participants"
    __table_args__ = (
        UniqueConstraint("ticket_id", "user_id", name="uq_ticket_participant"),
    )
    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=uid)
    ticket_id: Mapped[str] = mapped_column(
        ForeignKey("tickets.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"))
    context: Mapped[str] = mapped_column(Text)
    frequency: Mapped[str] = mapped_column(String(30))
    minutes: Mapped[int] = mapped_column(Integer)


class Comment(Base):
    __tablename__ = "comments"
    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=uid)
    ticket_id: Mapped[str] = mapped_column(
        ForeignKey("tickets.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    date: Mapped[datetime] = mapped_column(DateTime, default=now)
    text: Mapped[str] = mapped_column(Text)


class TicketEvent(Base):
    __tablename__ = "ticket_events"
    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=uid)
    ticket_id: Mapped[str] = mapped_column(
        ForeignKey("tickets.id", ondelete="CASCADE"), index=True
    )
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    date: Mapped[datetime] = mapped_column(DateTime, default=now)
    text: Mapped[str] = mapped_column(Text)
    field: Mapped[str | None] = mapped_column(String(40))
    old_value: Mapped[str | None] = mapped_column(Text)
    new_value: Mapped[str | None] = mapped_column(Text)


class Attachment(Base):
    __tablename__ = "attachments"
    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=uid)
    ticket_id: Mapped[str | None] = mapped_column(ForeignKey("tickets.id"), index=True)
    uploader_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255))
    key: Mapped[str] = mapped_column(String(100), unique=True)
    size: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    ticket: Mapped[Ticket | None] = relationship(back_populates="attachments")


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[str] = mapped_column(String(80), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    ticket_id: Mapped[str] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"))
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    dedup_key: Mapped[str | None] = mapped_column(String(255), unique=True)


class Cluster(Base):
    __tablename__ = "clusters"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    keywords: Mapped[str] = mapped_column(Text)


class TicketCluster(Base):
    __tablename__ = "ticket_clusters"
    ticket_id: Mapped[str] = mapped_column(
        ForeignKey("tickets.id", ondelete="CASCADE"), primary_key=True
    )
    cluster_id: Mapped[str] = mapped_column(ForeignKey("clusters.id"), primary_key=True)
