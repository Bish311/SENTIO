from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models import Case

router = APIRouter(prefix="/cases", tags=["cases"])

@router.get("")
async def list_cases(
    state: str | None = Query(default=None),
    batch_id: str | None = Query(default=None),
    arm: str | None = Query(default=None),
    kind: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    query = select(Case)
    if state is not None:
        query = query.where(Case.state == state)
    if batch_id is not None:
        query = query.where(Case.batch_id == batch_id)
    if arm is not None:
        query = query.where(Case.arm == arm)
    if kind is not None:
        query = query.where(Case.kind == kind)

    query = query.order_by(desc(Case.opened_at)).offset(offset).limit(limit)
    result = await session.execute(query)
    cases = result.scalars().all()

    response: list[dict[str, Any]] = []
    for c in cases:
        response.append(
            {
                "id": c.id,
                "subscription_id": c.subscription_id,
                "customer_id": c.customer_id,
                "state": c.state,
                "kind": c.kind,
                "amount_at_risk_paise": c.amount_at_risk_paise,
                "root_cause": c.root_cause,
                "arm": c.arm,
                "batch_id": c.batch_id,
                "outcome": c.outcome,
                "recovered_paise": c.recovered_paise,
                "opened_at": c.opened_at.isoformat() if c.opened_at else None,
            }
        )
    return response
