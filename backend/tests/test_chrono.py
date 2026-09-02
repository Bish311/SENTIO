from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.chrono.jobs import get_pending_jobs, schedule_job
from app.chrono.ptp import extract_and_book_ptp, is_case_ptp_active
from app.chrono.timing import (
    calculate_next_legal_window,
    calculate_next_payday,
    get_post_payday_window,
    is_inside_quiet_hours,
)
from app.models import Customer, Subscription
from app.pulse.sweep import run_prevention_sweep
from app.worker import process_pending_jobs


def test_chrono_timing_functions() -> None:
    now_dt = datetime(2026, 9, 1, 12, 0, tzinfo=timezone.utc)
    payday_date = calculate_next_payday(now_dt, 5)
    assert payday_date.day == 5

    start_win, end_win = get_post_payday_window(payday_date)
    assert start_win.day == 6

    time_night_utc = datetime(2026, 9, 1, 16, 30, tzinfo=timezone.utc)
    assert is_inside_quiet_hours(time_night_utc) is True

    next_legal = calculate_next_legal_window(time_night_utc)
    assert next_legal.hour == 9
    assert next_legal.minute == 15


@pytest.mark.asyncio
async def test_chrono_ptp_booking_and_pause(db_session: AsyncSession) -> None:
    future_date = (datetime.now(timezone.utc).date()).replace(day=28)
    mock_t3_resp = {
        "promised_date": future_date.isoformat(),
        "amount_paise": 29900,
        "confidence": 0.95,
        "verbatim_quote": "28th ko pakka",
    }
    with patch("app.chrono.ptp.call_openrouter", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = mock_t3_resp
        res = await extract_and_book_ptp(
            session=db_session,
            case_id="case_chrono_01",
            reply_text="28th ko pakka kar dunga",
            locale="hi",
        )
        assert res["status"] == "booked"
        assert res["confidence"] == 0.95

        is_active = await is_case_ptp_active(db_session, "case_chrono_01")
        assert is_active is True


@pytest.mark.asyncio
async def test_jobs_queue_and_worker(db_session: AsyncSession) -> None:
    now_dt = datetime.now(timezone.utc)
    job = await schedule_job(
        session=db_session,
        job_type="test_noop",
        run_at=now_dt,
        payload={"foo": "bar"},
        idempotency_key="job_test_01",
    )
    assert job.status == "pending"

    pending = await get_pending_jobs(db_session, as_of=now_dt)
    assert len(pending) > 0

    processed = await process_pending_jobs(db_session)
    assert processed >= 1


@pytest.mark.asyncio
async def test_prevention_sweep(db_session: AsyncSession) -> None:
    cust = Customer(
        id="cust_prev_01",
        name="Bish10",
        email="bish10@example.com",
        phone="+919000000010",
        locale="en",
    )
    sub = Subscription(
        id="sub_prev_01",
        customer_id="cust_prev_01",
        plan_id="plan_299",
        amount_paise=29900,
        status="active",
        arm="agent",
        batch_id="batch_prev",
        retry_budget_used=2,
    )
    db_session.add(cust)
    db_session.add(sub)
    await db_session.flush()

    res = await run_prevention_sweep(db_session)
    assert res["found_budget_risk"] >= 1
