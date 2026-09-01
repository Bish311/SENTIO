from datetime import datetime, timezone

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.guard.receipt import build_receipt
from app.models import Case, Customer
from app.reach.channels import send_customer_message
from app.reach.draft import generate_fallback_draft, lint_message_content
from app.reach.executor import execute_allowed_proposal
from app.reach.links import create_case_payment_link


def test_lint_message_content_banned_words() -> None:
    ok, err = lint_message_content("Please pay now or face police action. Reply STOP.")
    assert ok is False
    assert "BANNED_WORD_DETECTED" in (err or "")

    ok, err = lint_message_content("Please pay now or court notice will be sent. Reply STOP.")
    assert ok is False
    assert "BANNED_WORD_DETECTED" in (err or "")


def test_lint_message_content_missing_optout() -> None:
    ok, err = lint_message_content("Please complete your subscription payment of Rs 299.")
    assert ok is False
    assert err == "MISSING_OPTOUT_INSTRUCTION"


def test_lint_message_content_valid() -> None:
    valid_text = (
        "Hi Bish, update payment of Rs 299 here: https://rzp.io/i/123. Reply STOP to opt out."
    )
    ok, err = lint_message_content(valid_text)
    assert ok is True
    assert err is None


def test_generate_fallback_draft() -> None:
    draft = generate_fallback_draft("Bish1", 29900, "https://rzp.io/i/link_123")
    assert "₹299" in draft
    assert "Bish1" in draft
    assert "STOP" in draft


@pytest.mark.asyncio
async def test_reach_links_and_channels(db_session: AsyncSession) -> None:
    expire_time = datetime(2026, 9, 2, 12, 0, tzinfo=timezone.utc)
    link_id = await create_case_payment_link(
        session=db_session,
        case_id="case_reach_01",
        intervention_id="intv_reach_01",
        amount_paise=29900,
        expire_by=expire_time,
    )
    assert link_id.startswith("link_") or link_id.startswith("plink_")

    msg_id = await send_customer_message(
        session=db_session,
        case_id="case_reach_01",
        intervention_id="intv_reach_01",
        channel="whatsapp",
        recipient="+919000000001",
        content="Test content. Reply STOP",
    )
    assert msg_id.startswith("msg_")


@pytest.mark.asyncio
async def test_execute_allowed_proposal_refuses_deny(db_session: AsyncSession) -> None:
    case_obj = Case(
        id="case_reach_02",
        subscription_id="sub_02",
        customer_id="cust_02",
        state="INTERVENING",
        kind="recovery",
        amount_at_risk_paise=29900,
        arm="agent",
        batch_id="batch_02",
        opened_at=datetime.now(timezone.utc),
    )
    cust_obj = Customer(
        id="cust_02",
        name="Bish2",
        email="bish2@example.com",
        phone="+919000000002",
        locale="en",
    )
    db_session.add(case_obj)
    db_session.add(cust_obj)
    await db_session.flush()

    deny_receipt = build_receipt(
        case_id="case_reach_02",
        intervention_id="intv_reach_02",
        verdict="DENY",
        rules_evaluated=["quiet_hours"],
        violations=["QUIET_HOURS_VIOLATION"],
        context={},
    )

    with pytest.raises(PermissionError):
        await execute_allowed_proposal(
            session=db_session,
            case_row=case_obj,
            customer_row=cust_obj,
            intervention_id="intv_reach_02",
            action_type="payment_link",
            receipt=deny_receipt,
        )


@pytest.mark.asyncio
async def test_execute_allowed_proposal_success_link(db_session: AsyncSession) -> None:
    case_obj = Case(
        id="case_reach_03",
        subscription_id="sub_03",
        customer_id="cust_03",
        state="INTERVENING",
        kind="recovery",
        amount_at_risk_paise=19900,
        arm="agent",
        batch_id="batch_03",
        opened_at=datetime.now(timezone.utc),
    )
    cust_obj = Customer(
        id="cust_03",
        name="Bish3",
        email="bish3@example.com",
        phone="+919000000003",
        locale="en",
    )
    db_session.add(case_obj)
    db_session.add(cust_obj)
    await db_session.flush()

    allow_receipt = build_receipt(
        case_id="case_reach_03",
        intervention_id="intv_reach_03",
        verdict="ALLOW",
        rules_evaluated=["quiet_hours", "exact_amount_only"],
        violations=[],
        context={},
    )

    result = await execute_allowed_proposal(
        session=db_session,
        case_row=case_obj,
        customer_row=cust_obj,
        intervention_id="intv_reach_03",
        action_type="payment_link",
        receipt=allow_receipt,
    )
    assert "link_id" in result
    assert result["link_id"].startswith("plink_") or result["link_id"].startswith("link_")
    assert "message_id" in result
    assert result["message_id"].startswith("msg_")


def test_lint_message_content_all_banned_tokens() -> None:
    banned_samples = [
        "Your account is marked as a defaulter. Reply STOP.",
        "You will incur a penalty of Rs 500. Reply STOP.",
        "Arrest warrant will be issued. Reply STOP.",
        "This will impact your CIBIL score. Reply STOP.",
        "Legal notice will be sent. Reply STOP.",
    ]
    for sample in banned_samples:
        ok, err = lint_message_content(sample)
        assert ok is False
        assert err is not None
        assert "BANNED_WORD_DETECTED" in err

