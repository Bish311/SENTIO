from datetime import datetime

from app.core.config import settings


def rule_kill_switch(kill_switch_active: bool) -> tuple[bool, str | None]:
    if kill_switch_active:
        return False, "KILL_SWITCH_ACTIVE"
    return True, None


def rule_opt_out(customer_opted_out: bool) -> tuple[bool, str | None]:
    if customer_opted_out:
        return False, "CUSTOMER_OPTED_OUT"
    return True, None


def rule_quiet_hours(
    proposed_time_utc: datetime,
    action_type: str,
) -> tuple[bool, str | None]:
    if action_type in ["retry", "handoff"]:
        return True, None

    ist_time = proposed_time_utc.astimezone(settings.timezone)
    hour = ist_time.hour

    if hour >= 21 or hour < 9:
        return False, "QUIET_HOURS_VIOLATION"
    return True, None


def rule_max_contacts_7d(contact_count_7d: int) -> tuple[bool, str | None]:
    if contact_count_7d >= 3:
        return False, "CONTACT_BUDGET_EXCEEDED_7D"
    return True, None


def rule_min_gap(seconds_since_last_contact: float | None) -> tuple[bool, str | None]:
    if seconds_since_last_contact is None:
        return True, None
    if seconds_since_last_contact < 6 * 3600:
        return False, "CONTACT_GAP_TOO_SHORT"
    return True, None


def rule_exact_amount(proposed_paise: int, debt_paise: int) -> tuple[bool, str | None]:
    if proposed_paise != debt_paise:
        return False, "AMOUNT_MISMATCH"
    return True, None


def rule_retry_budget(retry_count: int) -> tuple[bool, str | None]:
    if retry_count >= 3:
        return False, "RETRY_BUDGET_EXCEEDED"
    return True, None


def rule_confidence_threshold(
    confidence: float | None,
    action_type: str,
) -> tuple[bool, str | None]:
    if action_type in ["handoff"]:
        return True, None
    if confidence is not None and confidence < 0.70:
        return False, "LOW_CONFIDENCE_AUTO_ACTION_BLOCKED"
    return True, None
