from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.chrono.jobs import get_pending_jobs, mark_job_completed, mark_job_failed
from app.core.clock import now_utc
from app.models import PaymentLink, Promise
from app.pulse.sweep import run_prevention_sweep
from app.spine.ingest import append_event
from app.spine.projector import project_event


async def process_pending_jobs(session: AsyncSession) -> int:
    now_dt = now_utc()
    pending = await get_pending_jobs(session, as_of=now_dt, limit=20)
    executed_count = 0

    for job in pending:
        try:
            await _dispatch_single_job(session, job.type, job.payload)
            await mark_job_completed(session, job.id)
            executed_count = executed_count + 1
        except Exception as exc:
            await mark_job_failed(session, job.id, str(exc))

    await session.commit()
    return executed_count


async def _dispatch_single_job(
    session: AsyncSession,
    job_type: str,
    payload: dict[str, Any],
) -> None:
    if job_type == "prevention_sweep":
        await run_prevention_sweep(session)
    elif job_type == "ptp_wake_up":
        promise_id = payload.get("promise_id")
        case_id = payload.get("case_id")
        if promise_id and case_id:
            prom_res = await session.execute(select(Promise).where(Promise.id == promise_id))
            prom = prom_res.scalar_one_or_none()
            if prom and prom.status == "booked":
                ev = await append_event(
                    session=session,
                    actor="agent",
                    event_type="ptp.broken",
                    case_id=case_id,
                    payload={"promise_id": promise_id, "case_id": case_id},
                )
                if ev is not None:
                    await project_event(session, ev)
    elif job_type == "link_expiry_check":
        link_id = payload.get("link_id")
        if link_id:
            link_res = await session.execute(select(PaymentLink).where(PaymentLink.id == link_id))
            link = link_res.scalar_one_or_none()
            if link and link.status == "created" and link.expire_by <= now_utc():
                link.status = "expired"
