from datetime import datetime, timezone

from app.core.config import settings

_pinned_clock: datetime | None = None


def set_pinned_clock(mock_time: datetime | None) -> None:
    global _pinned_clock
    _pinned_clock = mock_time


def now_utc() -> datetime:
    if _pinned_clock is not None:
        return _pinned_clock.astimezone(timezone.utc)
    return datetime.now(timezone.utc)


def now_ist() -> datetime:
    return now_utc().astimezone(settings.timezone)
