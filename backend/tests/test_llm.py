"""Two offline tests: graceful fallback/budget/cache and privacy masking."""

import json

import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.ai.llm import GeminiProvider, mask_personal_data
from app.config import Settings
from app.models import LLMCache, LLMUsage


def test_generation_fallback_preserves_budget_and_cached_answers(monkeypatch, caplog):
    engine = create_engine("sqlite://")
    LLMCache.__table__.create(engine)
    LLMUsage.__table__.create(engine)
    network_calls = []

    def forbidden_network(*args, **kwargs):
        network_calls.append(True)
        raise AssertionError("Network is forbidden in tests")

    monkeypatch.setattr(httpx.Client, "post", forbidden_network)
    with Session(engine) as db:
        for key, mode in [("", "gemini"), ("offline-test-key", "none")]:
            provider = GeminiProvider(
                Settings(_env_file=None, gemini_api_key=key, llm_provider=mode)
            )
            result = provider.draft(
                db,
                "Заявки без параметров",
                "Не хватает параметров изделий",
                "Закупки",
                "Закупки",
                "В работе",
                [],
            )
            assert result["source"] == "rules" and result["text"]
            assert provider.status(db)["callsToday"] == 0

        config = Settings(
            _env_file=None, gemini_api_key="offline-test-key", llm_daily_limit=3
        )
        provider = GeminiProvider(config)
        attempts = []

        def response(function, payload):
            attempts.append(payload)
            if len(attempts) == 1:
                raise httpx.ReadTimeout("must-not-log-this-secret")
            text = (
                "{"
                if len(attempts) == 2
                else json.dumps(
                    {
                        "text": "Проверим состав заявки. Согласуем обязательные поля с проектировщиками."
                    }
                )
            )
            return {
                "candidates": [
                    {"finishReason": "STOP", "content": {"parts": [{"text": text}]}}
                ],
                "usageMetadata": {
                    "promptTokenCount": 12,
                    "candidatesTokenCount": 8,
                    "totalTokenCount": 20,
                },
            }

        monkeypatch.setattr(provider, "_request", response)
        args = (
            db,
            "Заявки без параметров",
            "Не хватает параметров изделий",
            "Закупки",
            "Закупки",
            "В работе",
            [],
        )
        assert provider.draft(*args)["source"] == "rules"  # timeout
        assert (
            provider.draft(*args)["source"] == "rules"
        )  # invalid JSON, usage still counted
        generated = provider.draft(*args)
        assert generated["source"] == "llm" and not generated["cached"]
        # New provider instance reads the persistent cache even after the daily limit.
        cached = GeminiProvider(config).draft(*args)
        assert cached["cached"] and cached["text"] == generated["text"]
        limited = provider.draft(
            db,
            "Другая проблема",
            "Другая ситуация без совпадения кеша",
            "Закупки",
            "Закупки",
            "В работе",
            [],
        )
        assert limited["source"] == "rules" and "лимит" in limited["notice"]
        assert len(attempts) == 3 and not network_calls
        assert provider.status(db)["callsToday"] == 3
        assert provider.status(db)["tokensToday"] == 40
        assert "must-not-log-this-secret" not in caplog.text
    engine.dispose()


def test_mask_personal_data_handles_nested_payload_without_changing_metrics():
    original = {
        "text": "Почта ivan.petrov@example.ru, +7 (999) 123-45-67, 8 999 765 43 21; паспорт 45 08 123456; ИНН 7707083893 и 500100732259.",
        "related": [
            {
                "result": "Контакт +44 7700 900123, Петров@пример.рф; A-001 от 10.11.2026."
            }
        ],
        "monthlyCost": 125.5,
        "count": 12,
    }
    masked = mask_personal_data(original)
    result = json.dumps(masked, ensure_ascii=False)
    for sensitive in [
        "ivan.petrov@example.ru",
        "999",
        "123456",
        "7707083893",
        "500100732259",
        "7700",
        "Петров@пример.рф",
    ]:
        assert sensitive not in result
    assert "[EMAIL]" in result and "[ТЕЛЕФОН]" in result and "[ДОКУМЕНТ]" in result
    assert "A-001" in result and "10.11.2026" in result
    assert masked["monthlyCost"] == 125.5 and masked["count"] == 12
    assert "ivan.petrov@example.ru" in original["text"]
