import random

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.mirror.batch_gen import create_batch_world
from app.mirror.personas import generate_personas
from app.mirror.replay import build_payment_failed_payload, build_payment_link_paid_payload
from app.mirror.responder import sample_customer_outcome
from app.spine.verify import verify_webhook_signature


def test_personas_names_conform_to_r3() -> None:
    personas = generate_personas(20, seed=42)
    assert len(personas) == 20

    for p in personas:
        assert p["name"].startswith("Bish") or p["name"].startswith("Bishwayan")
        assert p["email"].endswith("@example.com")
        assert p["phone"].startswith("+9190000")


def test_personas_reproducibility() -> None:
    set_a = generate_personas(10, seed=123)
    set_b = generate_personas(10, seed=123)
    assert set_a == set_b


def test_wire_identical_payment_failed_payload() -> None:
    payload_bytes, sig = build_payment_failed_payload(
        subscription_id="sub_0001_agent",
        amount_paise=29900,
        decline_family="insufficient_funds",
    )
    assert verify_webhook_signature(payload_bytes, sig) is True
    assert b"payment.failed" in payload_bytes
    assert b"sub_0001_agent" in payload_bytes


def test_wire_identical_payment_link_paid_payload() -> None:
    payload_bytes, sig = build_payment_link_paid_payload(
        link_id="link_0001",
        payment_id="pay_0001",
        amount_paise=29900,
    )
    assert verify_webhook_signature(payload_bytes, sig) is True
    assert b"payment_link.paid" in payload_bytes


def test_outcome_sampling_honesty_floor() -> None:
    persona_never_recovers = {"never_recovers": True}
    rng = random.Random(42)
    outcome = sample_customer_outcome(
        root_cause="cash_timing",
        arm="agent",
        persona=persona_never_recovers,
        channel_matched=True,
        seq=1,
        rng=rng,
    )
    assert outcome == "ignored"


@pytest.mark.asyncio
async def test_create_batch_world(db_session: AsyncSession) -> None:
    result = await create_batch_world(db_session, seed=99, n_customers=10)
    assert result["customers_count"] == 10
    assert result["subscriptions_count"] == 20
