import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.cases.engine import handle_payment_failed
from app.cases.ladders import get_ladder_step
from app.cases.machine import is_terminal_state, validate_transition
from app.core.errors import InvalidCaseStateError


def test_valid_state_transitions() -> None:
    assert validate_transition("DETECTED", "DIAGNOSED") is True
    assert validate_transition("DIAGNOSED", "INTERVENING") is True
    assert validate_transition("INTERVENING", "AWAITING_OUTCOME") is True
    assert validate_transition("AWAITING_OUTCOME", "RECOVERED") is True


def test_invalid_state_transitions() -> None:
    with pytest.raises(InvalidCaseStateError):
        validate_transition("DETECTED", "RECOVERED")

    with pytest.raises(InvalidCaseStateError):
        validate_transition("RECOVERED", "DETECTED")


def test_terminal_states() -> None:
    assert is_terminal_state("RECOVERED") is True
    assert is_terminal_state("CLOSED_LOST") is True
    assert is_terminal_state("HUMAN_HANDOFF") is True
    assert is_terminal_state("PREVENTED") is True
    assert is_terminal_state("DETECTED") is False


def test_ladder_steps_retrieval() -> None:
    step1 = get_ladder_step("cash_timing", 1)
    assert step1 is not None
    assert step1["seq"] == 1
    assert step1["requires_payday"] is True

    step_budget = get_ladder_step("budget_burned", 1)
    assert step_budget is not None
    assert step_budget["type"] == "message"


@pytest.mark.asyncio
async def test_handle_payment_failed_opens_case(db_session: AsyncSession) -> None:
    case_obj = await handle_payment_failed(
        session=db_session,
        subscription_id="sub_case_test_01",
        amount_paise=29900,
        decline_code="insufficient_funds",
        error_details={"reason": "insufficient_funds"},
        arm="agent",
        batch_id="batch_test_01",
    )
    assert case_obj.id.startswith("case_")
    assert case_obj.state == "DETECTED"
    assert case_obj.amount_at_risk_paise == 29900

    same_case = await handle_payment_failed(
        session=db_session,
        subscription_id="sub_case_test_01",
        amount_paise=29900,
        decline_code="insufficient_funds",
        error_details={},
        arm="agent",
        batch_id="batch_test_01",
    )
    assert same_case.id == case_obj.id
