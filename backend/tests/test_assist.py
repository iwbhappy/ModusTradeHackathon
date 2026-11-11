"""Exactly two offline domain/validation checks for stage 8."""

from app.ai.assist import completeness_rules
from app.ai.llm import GeminiProvider
from app.config import Settings


def test_completeness_rules_ask_only_for_missing_signals():
    vague = completeness_rules("С заявками всё плохо и это мешает работе")
    assert not vague["complete"] and len(vague["questions"]) == 3
    partial = completeness_rules("При согласовании документов всё зависает каждый день")
    assert partial == {
        "complete": False,
        "questions": ["Есть ли конкретный пример — номер заявки или объекта?"],
    }
    assert completeness_rules(
        "На объекте при закупке каждый раз теряются параметры, например заявка 42."
    ) == {"complete": True, "questions": []}
    assert all(len(question) <= 140 for question in vague["questions"])


def test_root_cause_validation_removes_ids_outside_input_and_duplicates():
    provider = GeminiProvider(
        Settings(_env_file=None, llm_provider="none", gemini_api_key="")
    )
    result = provider._validate(
        "root_cause",
        {
            "cause": "Не определён владелец согласования.",
            "solution": "Назначить владельца и описать маршрут.",
            "evidence": ["T-1", "invented", "T-1", "T-2"],
            "tried": "",
        },
        {"tickets": [{"id": "T-1"}, {"id": "T-2"}, {"id": "T-3"}]},
    )
    assert result["evidence"] == ["T-1", "T-2"]
