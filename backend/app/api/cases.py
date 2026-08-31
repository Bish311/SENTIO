from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models import Case, Event, Intervention, Promise

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

    return {
        "case": {
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
        },
        "timeline": timeline,
        "interventions": intv_list,
        "promises": prom_list,
    }
