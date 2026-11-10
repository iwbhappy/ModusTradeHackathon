from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import json

from ..config import settings


class BusinessCalendar:
    def __init__(
        self,
        holidays: set[date],
        working_weekends: set[date] | None = None,
        timezone_name: str = "Europe/Moscow",
    ):
        self.holidays = holidays
        self.working_weekends = working_weekends or set()
        self.timezone = ZoneInfo(timezone_name)

    def is_workday(self, day: date) -> bool:
        return day in self.working_weekends or (
            day.weekday() < 5 and day not in self.holidays
        )

    def local(self, value: datetime) -> datetime:
        return value.replace(tzinfo=timezone.utc).astimezone(self.timezone)

    def add_days(self, value: datetime, days: int) -> datetime:
        local = self.local(value)
        direction = 1 if days >= 0 else -1
        count = abs(days)
        while count:
            local += timedelta(days=direction)
            if self.is_workday(local.date()):
                count -= 1
        return local.astimezone(timezone.utc).replace(tzinfo=None)

    def hours_between(self, start: datetime, end: datetime) -> float:
        left, right = self.local(start), self.local(end)
        cursor = left.replace(hour=0, minute=0, second=0, microsecond=0)
        seconds = 0.0
        while cursor < right:
            if self.is_workday(cursor.date()):
                a = cursor.replace(hour=9)
                b = cursor.replace(hour=17)
                seconds += max(0, (min(b, right) - max(a, left)).total_seconds())
            cursor += timedelta(days=1)
        return seconds / 3600

    def days_between(self, start: datetime, end: datetime) -> int:
        left, right = self.local(start).date(), self.local(end).date()
        if left > right:
            return -self.days_between(end, start)
        count = 0
        while left < right:
            left += timedelta(days=1)
            count += int(self.is_workday(left))
        return count


def calendar() -> BusinessCalendar:
    data = json.loads(settings().holidays_path.read_text(encoding="utf-8"))
    return BusinessCalendar(
        {date.fromisoformat(d) for d in data["holidays"]},
        {date.fromisoformat(d) for d in data["working_weekends"]},
        settings().business_timezone,
    )
