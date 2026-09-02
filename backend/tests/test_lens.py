from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.lens.diagnose import diagnose_payment_failure
from app.lens.matrix import lookup_decline_matrix


def test_matrix_lookup_known_families() -> None:
    hit_nsf = lookup_decline_matrix("insufficient_funds")
    assert hit_nsf is not None
    assert hit_nsf[0] == "cash_timing"
    assert hit_nsf[1] == 1.0

    hit_auth = lookup_decline_matrix("3ds_abandoned")
    assert hit_auth is not None
    assert hit_auth[0] == "friction"

    hit_card = lookup_decline_matrix("card_expired")
    assert hit_card is not None
    assert hit_card[0] == "dead_instrument"

    hit_unknown = lookup_decline_matrix("unknown_decline_code_xyz")
    assert hit_unknown is None


@pytest.mark.asyncio
async def test_diagnose_payment_failure_matrix_path(db_session: AsyncSession) -> None:
    cause, conf, source, handoff = await diagnose_payment_failure(
        session=db_session,
        case_id="case_lens_01",
        decline_code="insufficient_funds",
    )
    assert cause == "cash_timing"
    assert conf == 1.0
    assert source == "matrix"
    assert handoff is False


@pytest.mark.asyncio
async def test_diagnose_payment_failure_llm_path(db_session: AsyncSession) -> None:
    mock_llm_return = {
        "cause": "friction",
        "confidence": 0.85,
        "reasoning": "Customer dropped out during OTP",
    }
    with patch("app.lens.diagnose.call_openrouter", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = mock_llm_return
        cause, conf, source, handoff = await diagnose_payment_failure(
            session=db_session,
            case_id="case_lens_02",
            decline_code="custom_opaque_error",
        )
        assert cause == "friction"
        assert conf == 0.85
        assert source == "llm"
        assert handoff is False


@pytest.mark.asyncio
async def test_diagnose_payment_failure_low_confidence_handoff(db_session: AsyncSession) -> None:
    mock_llm_low_conf = {
        "cause": "other",
        "confidence": 0.40,
        "reasoning": "Unclear reason",
    }
    with patch("app.lens.diagnose.call_openrouter", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = mock_llm_low_conf
        cause, conf, source, handoff = await diagnose_payment_failure(
            session=db_session,
            case_id="case_lens_03",
            decline_code="unintelligible_error",
        )
        assert cause == "other"
        assert conf == 0.40
        assert source == "llm"
        assert handoff is True
