from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models import Case

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/ledger")
async def get_ledger_metrics(
    arm: str | None = Query(default=None),
    batch_id: str | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    query = select(Case).where(Case.outcome == "recovered")
    if arm is not None:
        query = query.where(Case.arm == arm)
    if batch_id is not None:
        query = query.where(Case.batch_id == batch_id)

    query = query.order_by(desc(Case.closed_at))
    result = await session.execute(query)
    cases = result.scalars().all()

    ledger: list[dict[str, Any]] = []
    for c in cases:
        dur = 0
        if c.closed_at and c.opened_at:
            dur = int((c.closed_at - c.opened_at).total_seconds())
        ledger.append(
            {
                "case_id": c.id,
                "customer_id": c.customer_id,
                "subscription_id": c.subscription_id,
                "amount_at_risk_paise": c.amount_at_risk_paise,
                "recovered_paise": c.recovered_paise,
                "root_cause": c.root_cause,
                "arm": c.arm,
                "batch_id": c.batch_id,
                "opened_at": c.opened_at.isoformat() if c.opened_at else None,
                "closed_at": c.closed_at.isoformat() if c.closed_at else None,
                "duration_s": dur,
            }
        )
    return ledger


@router.get("/prevention")
async def get_prevention_metrics(
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    query = select(Case).where(Case.kind == "prevention")
    result = await session.execute(query)
    cases = result.scalars().all()

    avoided_paise = 0
    prevented_count = 0
    for c in cases:
        if c.state in ("settled", "closed") or c.outcome == "prevented":
            avoided_paise += c.amount_at_risk_paise
            prevented_count += 1

    return {
        "prevented_count": prevented_count,
        "avoided_paise": avoided_paise,
        "total_prevention_cases": len(cases),
    }
