from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin_stepper import run_live_single_step_case
from app.api.admin_verify import get_system_verification_report
from app.core.config import settings
from app.core.db import get_db
from app.models import Event, Policy
from app.spine.ingest import append_event

router = APIRouter(prefix="/admin", tags=["admin"])


async def verify_admin_token(x_admin_token: str = Header(...)) -> str:
    if x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    return x_admin_token


class KillSwitchRequest(BaseModel):
    enabled: bool


class SingleStepRequest(BaseModel):
    opaque: bool = Field(default=True)
    scenario_idx: int = Field(default=0)


@router.post("/kill-switch")
async def toggle_kill_switch(
    body: KillSwitchRequest,
    token: str = Depends(verify_admin_token),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    res = await session.execute(select(Policy).where(Policy.name == "kill_switch"))
    p = res.scalar_one_or_none()
    if p is None:
        p = Policy(name="kill_switch", params={"enabled": body.enabled}, enabled=body.enabled)
        session.add(p)
    else:
        p.params, p.enabled = {"enabled": body.enabled}, body.enabled

    await append_event(
        session, "admin", "policy.kill_switch_toggled", payload={"enabled": body.enabled}
    )
    await session.commit()
    return {"status": "ok", "kill_switch_active": body.enabled}


@router.get("/policy-denials")
async def get_policy_denials(
    token: str = Depends(verify_admin_token),
    session: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    q = select(Event).where(Event.event_type == "policy.denied")
    events = (await session.execute(q.order_by(Event.id.desc()).limit(100))).scalars().all()
    out: list[dict[str, Any]] = []
    for ev in events:
        out.append({
            "event_id": ev.id, "case_id": ev.case_id, "ts": ev.ts.isoformat(),
            "receipt": ev.payload.get("receipt", {}),
        })
    return out


@router.get("/system-verify")
async def system_verify(token: str = Depends(verify_admin_token)) -> dict[str, Any]:
    return get_system_verification_report()


@router.post("/single-step")
async def simulate_single_step(
    body: SingleStepRequest,
    token: str = Depends(verify_admin_token),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await run_live_single_step_case(
        session, opaque=body.opaque, scenario_idx=body.scenario_idx
    )


@router.get("/events/export")
async def export_events(
    token: str = Depends(verify_admin_token),
    session: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    q = select(Event).order_by(Event.id.asc()).limit(1000)
    events = (await session.execute(q)).scalars().all()
    exported: list[dict[str, Any]] = []
    for e in events:
        exported.append({
            "id": e.id, "ts": e.ts.isoformat(), "event_type": e.event_type,
            "actor": e.actor, "case_id": e.case_id, "payload": e.payload,
        })
    return exported
