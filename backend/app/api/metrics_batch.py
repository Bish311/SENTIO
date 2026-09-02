from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models import Case, Event

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/batch/{batch_id}")
async def get_batch_metrics(
    batch_id: str,
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    query = select(Case).where(Case.batch_id == batch_id)
    result = await session.execute(query)
    cases = result.scalars().all()

    denials_query = select(Event).where(Event.event_type == "policy.denied")
    denials_res = await session.execute(denials_query)
    all_denials = denials_res.scalars().all()

    arm_a_cases: list[Case] = []
    arm_b_cases: list[Case] = []
    for c in cases:
        if c.arm == "agent":
            arm_a_cases.append(c)
        else:
            arm_b_cases.append(c)

    a_rec_paise = 0
    a_rec_count = 0
    a_durations: list[int] = []
    for c in arm_a_cases:
        if c.outcome == "recovered":
            a_rec_paise += c.recovered_paise
            a_rec_count += 1
            if c.closed_at and c.opened_at:
                a_durations.append(int((c.closed_at - c.opened_at).total_seconds()))

    b_rec_paise = 0
    b_rec_count = 0
    b_durations: list[int] = []
    for c in arm_b_cases:
        if c.outcome == "recovered":
            b_rec_paise += c.recovered_paise
            b_rec_count += 1
            if c.closed_at and c.opened_at:
                b_durations.append(int((c.closed_at - c.opened_at).total_seconds()))

    a_durations.sort()
    b_durations.sort()
    med_a = a_durations[len(a_durations) // 2] if a_durations else 0
    med_b = b_durations[len(b_durations) // 2] if b_durations else 0

    a_rate = round(a_rec_count / len(arm_a_cases), 4) if arm_a_cases else 0.0
    b_rate = round(b_rec_count / len(arm_b_cases), 4) if arm_b_cases else 0.0
    lift = round(a_rec_paise / b_rec_paise, 2) if b_rec_paise > 0 else 1.0

    return {
        "batch_id": batch_id,
        "arm_a": {
            "name": "Sentio Recovery (Agent)",
            "total_cases": len(arm_a_cases),
            "recovered_cases": a_rec_count,
            "recovered_paise": a_rec_paise,
            "recovery_rate": a_rate,
            "median_ttr_s": med_a,
        },
        "arm_b": {
            "name": "Naive Retries (Baseline)",
            "total_cases": len(arm_b_cases),
            "recovered_cases": b_rec_count,
            "recovered_paise": b_rec_paise,
            "recovery_rate": b_rate,
            "median_ttr_s": med_b,
        },
        "lift": lift,
        "guardrail_blocks": len(all_denials),
    }
