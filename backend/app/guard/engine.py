from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.guard.receipt import PolicyReceipt
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
from app.guard.verdict import record_verdict


async def evaluate_proposal(
    session: AsyncSession,
    case_id: str,
    intervention_id: str,
    action_type: str,
    proposed_paise: int,
    debt_paise: int,
    proposed_time_utc: datetime,
    customer_opted_out: bool = False,
    contact_count_7d: int = 0,
    seconds_since_last_contact: float | None = None,
    retry_count: int = 0,
    confidence: float | None = 1.0,
    kill_switch_active: bool = False,
    extra_context: dict[str, Any] | None = None,
) -> PolicyReceipt:
    rules_evaluated: list[str] = []
    violations: list[str] = []

    rules_evaluated.append("kill_switch")
    ok, err = rule_kill_switch(kill_switch_active)
    if not ok and err:
        violations.append(err)
        return await record_verdict(
            session, case_id, intervention_id, "DENY", rules_evaluated, violations, extra_context
        )

    rules_evaluated.append("opt_out_respected")
    ok, err = rule_opt_out(customer_opted_out)
    if not ok and err:
        violations.append(err)
        return await record_verdict(
            session, case_id, intervention_id, "DENY", rules_evaluated, violations, extra_context
        )

    rules_evaluated.append("quiet_hours")
    ok, err = rule_quiet_hours(proposed_time_utc, action_type)
    if not ok and err:
        violations.append(err)

    rules_evaluated.append("max_contacts_7d")
    ok, err = rule_max_contacts_7d(contact_count_7d)
    if not ok and err:
        violations.append(err)

    rules_evaluated.append("min_gap_between_contacts")
    ok, err = rule_min_gap(seconds_since_last_contact)
    if not ok and err:
        violations.append(err)

    rules_evaluated.append("exact_amount_only")
    ok, err = rule_exact_amount(proposed_paise, debt_paise)
    if not ok and err:
        violations.append(err)

    rules_evaluated.append("retry_budget_ceiling")
    ok, err = rule_retry_budget(retry_count)
    if not ok and err:
        violations.append(err)

    rules_evaluated.append("no_auto_action_low_confidence")
    ok, err = rule_confidence_threshold(confidence, action_type)
    if not ok and err:
        violations.append(err)

    verdict = "ALLOW" if len(violations) == 0 else "DENY"
    return await record_verdict(
        session, case_id, intervention_id, verdict, rules_evaluated, violations, extra_context
    )
