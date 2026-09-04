from typing import Any

import ulid
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin import verify_admin_token
from app.core.db import get_db
from app.models import Customer, Subscription
from app.pulse.sweep import run_prevention_sweep

router = APIRouter(prefix="/admin", tags=["admin"])


class SweepRequest(BaseModel):
    seed_sample_risk: bool = Field(default=True)


@router.post("/run-sweep")
async def execute_pulse_sweep(
    body: SweepRequest = SweepRequest(),
    token: str = Depends(verify_admin_token),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    if body.seed_sample_risk:
        cid = f"cust_sweep_{str(ulid.ULID()).lower()[-6:]}"
        sub_id = f"sub_sweep_{cid[-6:]}"
        session.add(Customer(
            id=cid, name="Ananya Rao", email="ananya.rao@corp.in",
            phone="+919876543210", locale="hi_IN"
        ))
        session.add(Subscription(
            id=sub_id, customer_id=cid, plan_id="plan_pro_annual",
            amount_paise=249900, status="active", arm="agent",
            retry_budget_used=2, batch_id="batch_sweep_live"
        ))
        await session.commit()

    stats = await run_prevention_sweep(session)
    await session.commit()
    return {
        "status": "success",
        "found_budget_risk": stats.get("found_budget_risk", 0),
        "prevented_count": stats.get("prevented_count", 0),
        "avoided_paise": stats.get("prevented_count", 0) * 249900,
    }
