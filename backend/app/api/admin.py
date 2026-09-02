from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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


@router.post("/kill-switch")
async def toggle_kill_switch(
    body: KillSwitchRequest,
    token: str = Depends(verify_admin_token),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    policy_query = select(Policy).where(Policy.name == "kill_switch")
    result = await session.execute(policy_query)
    policy_row = result.scalar_one_or_none()

    if policy_row is None:
        policy_row = Policy(
            name="kill_switch", params={"enabled": body.enabled}, enabled=body.enabled
        )
        session.add(policy_row)
    else:
        policy_row.params = {"enabled": body.enabled}
        policy_row.enabled = body.enabled

    await append_event(
        session=session,
        actor="admin",
        event_type="policy.kill_switch_toggled",
        payload={"enabled": body.enabled},
    )
    await session.commit()
    return {"status": "ok", "kill_switch_active": body.enabled}


@router.get("/policy-denials")
async def get_policy_denials(
    token: str = Depends(verify_admin_token),
    session: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    query = (
        select(Event)
        .where(Event.event_type == "policy.denied")
        .order_by(Event.id.desc())
        .limit(100)
    )
    result = await session.execute(query)
    events = result.scalars().all()

    denials: list[dict[str, Any]] = []
    for ev in events:
        denials.append(
            {
                "event_id": ev.id,
                "case_id": ev.case_id,
                "ts": ev.ts.isoformat(),
                "receipt": ev.payload.get("receipt", {}),
            }
        )
    return denials


@router.get("/events/export")
async def export_events(
    token: str = Depends(verify_admin_token),
    session: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    query = select(Event).order_by(Event.id.asc()).limit(1000)
    result = await session.execute(query)
    events = result.scalars().all()

    exported: list[dict[str, Any]] = []
    for ev in events:
        exported.append(
            {
                "id": ev.id,
                "ts": ev.ts.isoformat(),
                "actor": ev.actor,
                "event_type": ev.event_type,
                "case_id": ev.case_id,
                "payload": ev.payload,
            }
        )
    return exported
