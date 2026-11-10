"""Allowlisted aggregate payload; no ticket bodies, comments, attachments or users."""

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import analytics, models as m
from .clusters import emerging


def summary_input(db: Session, user: m.User, days: int) -> dict:
    # summary checks the same analytics permissions and scope as GET /analytics.
    data = analytics.summary(db, user, days)
    groups = emerging(db, user, min(days or 365, 365))
    payload = {
        "days": days,
        "kpi": {
            key: data[key]
            for key in (
                "total",
                "openCount",
                "overdueCount",
                "considered",
                "medianHours",
                "resultRate",
                "implemented",
                "confirmed",
                "defaultConfirmed",
            )
        },
        "weekly": data["weekly"],
        "clusters": sorted(
            [c for c in data["clusterStats"] if c["count"]],
            key=lambda c: (-c["monthlyCost"], c["id"]),
        )[:10],
        "emerging": sorted(
            [
                {
                    "title": g["suggestedTitle"],
                    "count": len(g["tickets"]),
                    "departments": g["departments"],
                    "monthlyCost": g["monthlyCost"],
                }
                for g in groups
            ],
            key=lambda g: (-g["monthlyCost"], g["title"]),
        )[:5],
        "sla": sorted(data["sla"], key=lambda s: (-s["count"], s["department"])),
        "departments": data["departments"],
    }
    return remove_known_names(db, payload)


def remove_known_names(db: Session, payload: dict) -> dict:
    names = [name for name in db.scalars(select(m.User.name)) if len(name) >= 3]
    pattern = (
        re.compile(
            "|".join(re.escape(name) for name in sorted(names, key=len, reverse=True)),
            re.I,
        )
        if names
        else None
    )

    def remove_names(value):
        if isinstance(value, dict):
            return {key: remove_names(item) for key, item in value.items()}
        if isinstance(value, list):
            return [remove_names(item) for item in value]
        return (
            pattern.sub("[ИМЯ]", value) if pattern and isinstance(value, str) else value
        )

    return remove_names(payload)
