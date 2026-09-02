import calendar
from datetime import date, datetime, time, timedelta

from app.core.config import settings


def calculate_next_payday(now_dt: datetime, payday_day: int) -> date:
    tz = settings.timezone
    now_ist = now_dt.astimezone(tz)
    today = now_ist.date()

    target_day = min(max(1, payday_day), 28)
    if today.day <= target_day:
        return date(today.year, today.month, target_day)

    year = today.year
    month = today.month + 1
    if month > 12:
        month = 1
        year = year + 1

    last_day = calendar.monthrange(year, month)[1]
    clamped_day = min(target_day, last_day)
    return date(year, month, clamped_day)


def get_post_payday_window(payday_date: date) -> tuple[datetime, datetime]:
    tz = settings.timezone
    start_date = payday_date + timedelta(days=1)
    end_date = payday_date + timedelta(days=3)

    start_dt = datetime.combine(start_date, time(10, 30), tzinfo=tz)
    end_dt = datetime.combine(end_date, time(18, 0), tzinfo=tz)
    return start_dt, end_dt


def calculate_next_legal_window(now_dt: datetime) -> datetime:
    tz = settings.timezone
    now_ist = now_dt.astimezone(tz)
    current_hour = now_ist.hour

    if 9 <= current_hour < 21:
        return now_dt

    if current_hour >= 21:
        target_date = now_ist.date() + timedelta(days=1)
    else:
        target_date = now_ist.date()

    legal_time = time(9, 15)
    legal_dt = datetime.combine(target_date, legal_time, tzinfo=tz)
    return legal_dt


def is_inside_quiet_hours(now_dt: datetime) -> bool:
    tz = settings.timezone
    now_ist = now_dt.astimezone(tz)
    return now_ist.hour >= 21 or now_ist.hour < 9
