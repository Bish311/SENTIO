from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Job


async def schedule_job(
    session: AsyncSession,
    job_type: str,
    run_at: datetime,
    payload: dict[str, Any],
    idempotency_key: str,
) -> Job:
    query = select(Job).where(Job.idempotency_key == idempotency_key)
    res = await session.execute(query)
    existing = res.scalar_one_or_none()
    if existing is not None:
        return existing

    job_row = Job(
        type=job_type,
        run_at=run_at,
        payload=payload,
        status="pending",
        attempts=0,
        idempotency_key=idempotency_key,
    )
    session.add(job_row)
    await session.flush()
    return job_row


async def get_pending_jobs(
    session: AsyncSession,
    as_of: datetime,
    limit: int = 50,
) -> list[Job]:
    query = (
        select(Job)
        .where(Job.status == "pending")
        .where(Job.run_at <= as_of)
        .order_by(Job.run_at)
        .limit(limit)
    )
    res = await session.execute(query)
    return list(res.scalars().all())


async def mark_job_completed(session: AsyncSession, job_id: int) -> None:
    query = select(Job).where(Job.id == job_id)
    res = await session.execute(query)
    job = res.scalar_one_or_none()
    if job is not None:
        job.status = "done"


async def mark_job_failed(session: AsyncSession, job_id: int, error: str) -> None:
    query = select(Job).where(Job.id == job_id)
    res = await session.execute(query)
    job = res.scalar_one_or_none()
    if job is not None:
        job.attempts = job.attempts + 1
        job.last_error = error
        if job.attempts >= 3:
            job.status = "failed"
