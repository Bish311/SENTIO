import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import SignatureVerificationError
from app.models import Case
from app.spine.ingest import append_event, quarantine_event
from app.spine.projector import project_event
from app.spine.verify import sign_payload, verify_webhook_signature


@pytest.mark.asyncio
async def test_signature_verification_valid() -> None:
    body = b'{"event":"payment.failed"}'
    sig = sign_payload(body)
    assert verify_webhook_signature(body, sig) is True


@pytest.mark.asyncio
async def test_signature_verification_invalid() -> None:
    body = b'{"event":"payment.failed"}'
    with pytest.raises(SignatureVerificationError):
        verify_webhook_signature(body, "bad_signature")


@pytest.mark.asyncio
async def test_signature_verification_missing() -> None:
    body = b'{"event":"payment.failed"}'
    with pytest.raises(SignatureVerificationError):
        verify_webhook_signature(body, None)


@pytest.mark.asyncio
async def test_append_event_and_deduplication(db_session: AsyncSession) -> None:
    ev1 = await append_event(
        session=db_session,
        actor="system",
        event_type="payment.failed",
        payload={"amount": 29900},
        dedup_key="dup_123",
    )
    assert ev1 is not None

    ev2 = await append_event(
        session=db_session,
        actor="system",
        event_type="payment.failed",
        payload={"amount": 29900},
        dedup_key="dup_123",
    )
    assert ev2 is None


@pytest.mark.asyncio
async def test_quarantine_event(db_session: AsyncSession) -> None:
    q_ev = await quarantine_event(
        session=db_session,
        reason="invalid_signature",
        raw_sha="sha_test_123",
        payload={"raw": "test"},
    )
    assert q_ev.event_type == "event.quarantined"
    assert q_ev.actor == "system"


@pytest.mark.asyncio
async def test_project_case_opened_and_closed(db_session: AsyncSession) -> None:
    opened_ev = await append_event(
        session=db_session,
        actor="agent",
        event_type="case.opened",
        case_id="case_test_01",
        payload={
            "case_id": "case_test_01",
            "subscription_id": "sub_test_01",
            "amount_at_risk_paise": 29900,
            "arm": "agent",
        },
    )
    assert opened_ev is not None
    await project_event(db_session, opened_ev)

    res = await db_session.execute(select(Case).where(Case.id == "case_test_01"))
    case_row = res.scalar_one_or_none()
    assert case_row is not None
    assert case_row.state == "DETECTED"

    closed_ev = await append_event(
        session=db_session,
        actor="agent",
        event_type="case.closed",
        case_id="case_test_01",
        payload={"case_id": "case_test_01", "outcome": "recovered", "recovered_paise": 29900},
    )
    assert closed_ev is not None
    await project_event(db_session, closed_ev)

    res_after = await db_session.execute(select(Case).where(Case.id == "case_test_01"))
    case_closed = res_after.scalar_one_or_none()
    assert case_closed is not None
    assert case_closed.state == "RECOVERED"
    assert case_closed.recovered_paise == 29900
