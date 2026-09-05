from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models import Case, Customer, Event, Intervention, Promise, Subscription

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

    events = (await session.execute(select(Event).where(Event.case_id == case_id).order_by(Event.ts))).scalars().all()
    intvs = (await session.execute(select(Intervention).where(Intervention.case_id == case_id).order_by(Intervention.seq))).scalars().all()
    proms = (await session.execute(select(Promise).where(Promise.case_id == case_id).order_by(Promise.promised_date))).scalars().all()

    cust = await session.get(Customer, case_row.customer_id) if case_row.customer_id else None
    sub = await session.get(Subscription, case_row.subscription_id) if case_row.subscription_id else None

    timeline = [{"id": e.id, "ts": e.ts.isoformat(), "actor": e.actor, "event_type": e.event_type, "payload": e.payload} for e in events]
    intv_list = [{"id": i.id, "seq": i.seq, "type": i.type, "channel": i.channel, "status": i.status, "policy_receipt": i.policy_receipt} for i in intvs]
    prom_list = [{"id": p.id, "promised_date": p.promised_date.isoformat(), "status": p.status, "confidence": p.confidence} for p in proms]

    case_dict = {
        "id": case_row.id, "subscription_id": case_row.subscription_id, "customer_id": case_row.customer_id,
        "state": case_row.state, "amount_at_risk_paise": case_row.amount_at_risk_paise,
        "root_cause": case_row.root_cause, "arm": case_row.arm, "outcome": case_row.outcome,
        "recovered_paise": case_row.recovered_paise,
        "opened_at": case_row.opened_at.isoformat() if case_row.opened_at else None,
        "closed_at": case_row.closed_at.isoformat() if case_row.closed_at else None,
    }
    return {
        **case_dict, "case": case_dict,
        "customer": {"name": cust.name, "phone": cust.phone, "email": cust.email, "locale": cust.locale} if cust else None,
        "subscription": {"plan_id": sub.plan_id, "amount_paise": sub.amount_paise, "status": sub.status, "retry_budget_used": sub.retry_budget_used} if sub else None,
        "timeline": timeline, "interventions": intv_list, "promises": prom_list,
    }

