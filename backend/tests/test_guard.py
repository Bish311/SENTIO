import json
from datetime import datetime, timezone
from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.guard.engine import evaluate_proposal
from app.guard.rules import (
    rule_confidence_threshold,
    rule_exact_amount,
    rule_kill_switch,
    rule_max_contacts_7d,
    rule_min_gap,
    rule_opt_out,
    rule_quiet_hours,
    rule_retry_budget,
)


def test_rule_kill_switch() -> None:
    ok, err = rule_kill_switch(True)
    assert ok is False
    assert err == "KILL_SWITCH_ACTIVE"

    ok, err = rule_kill_switch(False)
    assert ok is True
    assert err is None


def test_rule_opt_out() -> None:
    ok, err = rule_opt_out(True)
    assert ok is False
    assert err == "CUSTOMER_OPTED_OUT"

    ok, err = rule_opt_out(False)
    assert ok is True
    assert err is None


def test_rule_quiet_hours() -> None:
    time_2130_ist = datetime(2026, 8, 31, 16, 0, tzinfo=timezone.utc)
    ok, err = rule_quiet_hours(time_2130_ist, "message")
    assert ok is False
    assert err == "QUIET_HOURS_VIOLATION"

    ok, err = rule_quiet_hours(time_2130_ist, "retry")
    assert ok is True
    assert err is None

    time_1400_ist = datetime(2026, 8, 31, 8, 30, tzinfo=timezone.utc)
    ok, err = rule_quiet_hours(time_1400_ist, "message")
    assert ok is True
    assert err is None


def test_rule_max_contacts_and_gap() -> None:
    ok, err = rule_max_contacts_7d(3)
    assert ok is False
    assert err == "CONTACT_BUDGET_EXCEEDED_7D"

    ok, err = rule_min_gap(3600 * 4)
    assert ok is False
    assert err == "CONTACT_GAP_TOO_SHORT"

    ok, err = rule_min_gap(3600 * 7)
    assert ok is True
    assert err is None


def test_rule_exact_amount_and_retries() -> None:
    ok, err = rule_exact_amount(19900, 29900)
    assert ok is False
    assert err == "AMOUNT_MISMATCH"

    ok, err = rule_retry_budget(3)
    assert ok is False
    assert err == "RETRY_BUDGET_EXCEEDED"

    ok, err = rule_confidence_threshold(0.65, "payment_link")
    assert ok is False
    assert err == "LOW_CONFIDENCE_AUTO_ACTION_BLOCKED"


@pytest.mark.asyncio
async def test_guard_eval_cases_fixtures(db_session: AsyncSession) -> None:
    fixtures_path = Path(__file__).resolve().parent.parent / "eval" / "guard_cases.json"
    with open(fixtures_path, "r", encoding="utf-8") as f:
        cases = json.load(f)

    for item in cases:
        time_utc = datetime.fromisoformat(item["proposed_time_ist"]).astimezone(timezone.utc)
        receipt = await evaluate_proposal(
            session=db_session,
            case_id=item["case_id"],
            intervention_id=item["intervention_id"],
            action_type=item["action_type"],
            proposed_paise=item["proposed_paise"],
            debt_paise=item["debt_paise"],
            proposed_time_utc=time_utc,
            customer_opted_out=item["customer_opted_out"],
            contact_count_7d=item["contact_count_7d"],
            seconds_since_last_contact=item["seconds_since_last_contact"],
            retry_count=item["retry_count"],
            confidence=item["confidence"],
            kill_switch_active=item["kill_switch_active"],
        )
        assert receipt.verdict == item["expected_verdict"], f"Failed for {item['name']}"
        assert receipt.violations == item["expected_violations"], (
            f"Failed violations for {item['name']}"
        )


@pytest.mark.asyncio
async def test_guard_accumulates_all_concurrent_violations(db_session: AsyncSession) -> None:
    time_2200_ist = datetime(2026, 8, 31, 16, 30, tzinfo=timezone.utc)
    receipt = await evaluate_proposal(
        session=db_session,
        case_id="case_multi_fail",
        intervention_id="intv_multi_fail",
        action_type="payment_link",
        proposed_paise=19900,
        debt_paise=29900,
        proposed_time_utc=time_2200_ist,
        customer_opted_out=False,
        contact_count_7d=4,
        seconds_since_last_contact=3600,
        retry_count=3,
        confidence=0.50,
        kill_switch_active=False,
    )
    assert receipt.verdict == "DENY"
    assert len(receipt.violations) == 6
    assert "QUIET_HOURS_VIOLATION" in receipt.violations
    assert "CONTACT_BUDGET_EXCEEDED_7D" in receipt.violations
    assert "CONTACT_GAP_TOO_SHORT" in receipt.violations
    assert "AMOUNT_MISMATCH" in receipt.violations
    assert "RETRY_BUDGET_EXCEEDED" in receipt.violations
    assert "LOW_CONFIDENCE_AUTO_ACTION_BLOCKED" in receipt.violations


@pytest.mark.asyncio
async def test_guard_short_circuits_on_kill_switch_and_optout(db_session: AsyncSession) -> None:
    time_2200_ist = datetime(2026, 8, 31, 16, 30, tzinfo=timezone.utc)
    kill_receipt = await evaluate_proposal(
        session=db_session,
        case_id="case_kill_sc",
        intervention_id="intv_kill_sc",
        action_type="payment_link",
        proposed_paise=19900,
        debt_paise=29900,
        proposed_time_utc=time_2200_ist,
        customer_opted_out=True,
        kill_switch_active=True,
    )
    assert kill_receipt.verdict == "DENY"
    assert kill_receipt.rules_evaluated == ["kill_switch"]
    assert kill_receipt.violations == ["KILL_SWITCH_ACTIVE"]

    optout_receipt = await evaluate_proposal(
        session=db_session,
        case_id="case_optout_sc",
        intervention_id="intv_optout_sc",
        action_type="payment_link",
        proposed_paise=19900,
        debt_paise=29900,
        proposed_time_utc=time_2200_ist,
        customer_opted_out=True,
        kill_switch_active=False,
    )
    assert optout_receipt.verdict == "DENY"
    assert optout_receipt.rules_evaluated == ["kill_switch", "opt_out_respected"]
    assert optout_receipt.violations == ["CUSTOMER_OPTED_OUT"]


def test_ist_exact_boundary_times() -> None:
    time_085959_ist = datetime(2026, 8, 31, 3, 29, 59, tzinfo=timezone.utc)
    ok_morning_early, err = rule_quiet_hours(time_085959_ist, "message")
    assert ok_morning_early is False
    assert err == "QUIET_HOURS_VIOLATION"

    time_090000_ist = datetime(2026, 8, 31, 3, 30, 0, tzinfo=timezone.utc)
    ok_morning_on_time, err = rule_quiet_hours(time_090000_ist, "message")
    assert ok_morning_on_time is True
    assert err is None

    time_205959_ist = datetime(2026, 8, 31, 15, 29, 59, tzinfo=timezone.utc)
    ok_night_late, err = rule_quiet_hours(time_205959_ist, "message")
    assert ok_night_late is True
    assert err is None

    time_210000_ist = datetime(2026, 8, 31, 15, 30, 0, tzinfo=timezone.utc)
    ok_night_on_time, err = rule_quiet_hours(time_210000_ist, "message")
    assert ok_night_on_time is False
    assert err == "QUIET_HOURS_VIOLATION"

    time_midnight_ist = datetime(2026, 8, 31, 18, 30, 0, tzinfo=timezone.utc)
    ok_midnight, err = rule_quiet_hours(time_midnight_ist, "message")
    assert ok_midnight is False
    assert err == "QUIET_HOURS_VIOLATION"

