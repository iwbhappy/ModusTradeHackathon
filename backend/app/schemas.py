from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class Input(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel, populate_by_name=True, extra="forbid"
    )


class Login(Input):
    user_id: str


class TicketDraft(Input):
    title: str = Field(default="", max_length=80)
    text: str = Field(min_length=20, max_length=6000)
    type: Literal["Проблема", "Предложение", "Положительный отзыв"]
    category: str
    target_department: str
    solution: str = Field(default="", max_length=6000)
    effect: str = Field(default="", max_length=6000)
    priority: Literal["Низкий", "Средний", "Высокий"] = "Средний"
    frequency: Literal["ежедневно", "еженедельно", "ежемесячно", "разово"] = (
        "еженедельно"
    )
    minutes: int = Field(default=30, ge=1, le=1440)
    attachments: list[str] = Field(default_factory=list, max_length=20)
    attachment_ids: list[str] = Field(default_factory=list, max_length=20)


class StatusChange(Input):
    status: str
    text: str = Field(default="", max_length=6000)


class TextInput(Input):
    text: str = Field(min_length=1, max_length=6000)


class StructureInput(TextInput):
    category: str = Field(default="", max_length=200)
    target_department: str = Field(default="", max_length=200)


class JoinInput(Input):
    context: str = Field(min_length=10, max_length=6000)
    frequency: Literal["ежедневно", "еженедельно", "ежемесячно", "разово"]
    minutes: int = Field(ge=1, le=1440)


class ReassignInput(Input):
    assignee_id: str
    reason: str = Field(min_length=10, max_length=6000)


class ConfirmInput(Input):
    solved: bool
    reason: str = Field(default="", max_length=6000)


class RuleInput(Input):
    id: str
    category: str
    department: str
    primary_id: str
    backup_id: str
    response_days: int = Field(ge=1, le=60)
    resolution_days: int = Field(ge=1, le=120)


class VacationInput(Input):
    vacation: bool


class SimilarInput(Input):
    text: str = Field(max_length=6000)
    category: str = ""
    target_department: str = ""


class ClusterInput(Input):
    title: str = Field(max_length=200)
    ticket_ids: list[str] = Field(min_length=2, max_length=50)
