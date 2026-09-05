import random
from typing import Any

import ulid
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin import verify_admin_token
from app.api.stepper_scenarios import FIRST_NAMES, LAST_NAMES, AMOUNTS
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
        rng = random.Random()
        fn, ln = rng.choice(FIRST_NAMES), rng.choice(LAST_NAMES)
        full_name = f"{fn} {ln}"
        email = f"{fn.lower()}.{ln.lower()}@corp.in"
        amt = rng.choice(AMOUNTS)
        cid = f"cust_sweep_{str(ulid.ULID()).lower()[-6:]}"
        sub_id = f"sub_sweep_{cid[-6:]}"
        digits = "".join([c for c in str(ulid.ULID()) if c.isdigit()])[-8:].ljust(8, "9")

        session.add(Customer(
            id=cid, name=full_name, email=email,
            phone=f"+9198{digits}", locale="hi_IN"
        ))
        session.add(Subscription(
            id=sub_id, customer_id=cid, plan_id="plan_pro_annual",
            amount_paise=amt, status="active", arm="agent",
            retry_budget_used=2, batch_id="batch_sweep_live"
        ))
        await session.commit()

    stats = await run_prevention_sweep(session)
    await session.commit()
    return {
        "status": "success",
        "found_budget_risk": stats.get("found_budget_risk", 0),
        "prevented_count": stats.get("prevented_count", 0),
        "avoided_paise": stats.get("avoided_paise", 0),
        "prevented_items": stats.get("prevented_items", []),
    }
