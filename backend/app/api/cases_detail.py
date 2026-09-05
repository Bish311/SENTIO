from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models import Case, Event, Intervention, Promise

router = APIRouter(prefix="/cases", tags=["cases"])

@router.get("/{case_id}")
async def get_case_detail(
    case_id: str,
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    case_res = await session.execute(select(Case).where(Case.id == case_id))
    case_row = case_res.scalar_one_or_none()
    if case_row is None:
        raise HTTPException(status_code=404, detail="Case not found")

    events_res = await session.execute(
        select(Event).where(Event.case_id == case_id).order_by(Event.ts)
    )
    events = events_res.scalars().all()

    intv_res = await session.execute(
        select(Intervention).where(Intervention.case_id == case_id).order_by(Intervention.seq)
    )
    interventions = intv_res.scalars().all()

    prom_res = await session.execute(
        select(Promise).where(Promise.case_id == case_id).order_by(Promise.promised_date)
    )
    promises = prom_res.scalars().all()

    timeline: list[dict[str, Any]] = []
    for ev in events:
        timeline.append(
            {
                "id": ev.id,
                "ts": ev.ts.isoformat(),
                "actor": ev.actor,
                "event_type": ev.event_type,
                "payload": ev.payload,
            }
        )

    intv_list: list[dict[str, Any]] = []
    for item in interventions:
        intv_list.append(
            {
                "id": item.id,
                "seq": item.seq,
                "type": item.type,
                "channel": item.channel,
                "status": item.status,
                "policy_receipt": item.policy_receipt,
            }
        )

    prom_list: list[dict[str, Any]] = []
    for p in promises:
        prom_list.append(
            {
                "id": p.id,
                "promised_date": p.promised_date.isoformat(),
                "status": p.status,
                "confidence": p.confidence,
            }
        )

    case_dict = {
        "id": case_row.id,
        "subscription_id": case_row.subscription_id,
        "customer_id": case_row.customer_id,
        "state": case_row.state,
        "amount_at_risk_paise": case_row.amount_at_risk_paise,
        "root_cause": case_row.root_cause,
        "arm": case_row.arm,
        "outcome": case_row.outcome,
        "recovered_paise": case_row.recovered_paise,
        "opened_at": case_row.opened_at.isoformat() if case_row.opened_at else None,
        "closed_at": case_row.closed_at.isoformat() if case_row.closed_at else None,
    }
    return {
        **case_dict,
        "case": case_dict,
        "timeline": timeline,
        "interventions": intv_list,
        "promises": prom_list,
    }
