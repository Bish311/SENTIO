from datetime import date, datetime, time, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import ulid
from sqlalchemy.ext.asyncio import AsyncSession

from app.chrono.jobs import schedule_job
from app.spine.ingest import append_event
from app.spine.projector import project_event


async def record_booked_promise(
    session: AsyncSession,
    case_id: str,
    parsed_date: date,
    amount_paise: int | None,
    confidence: float,
    quote: str,
    tz: ZoneInfo,
) -> dict[str, Any]:
    promise_id = f"prom_{str(ulid.ULID()).lower()}"
    event_row = await append_event(
        session=session,
        actor="agent",
        event_type="ptp.booked",
        case_id=case_id,
        payload={
            "promise_id": promise_id,
            "case_id": case_id,
            "promised_date": parsed_date.isoformat(),
            "amount_paise": amount_paise,
            "confidence": confidence,
            "quote": quote,
        },
    )
    if event_row is not None:
        await project_event(session, event_row)

    wake_date = parsed_date + timedelta(days=1)
    wake_dt = datetime.combine(wake_date, time(9, 15), tzinfo=tz)
    await schedule_job(
        session=session,
        job_type="ptp_wake_up",
        run_at=wake_dt,
        payload={"promise_id": promise_id, "case_id": case_id},
        idempotency_key=f"ptp:{promise_id}",
    )
    return {
        "status": "booked",
        "promise_id": promise_id,
        "promised_date": parsed_date.isoformat(),
        "confidence": confidence,
    }
