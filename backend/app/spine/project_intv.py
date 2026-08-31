from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import now_utc
from app.models import Intervention, PaymentLink

async def project_intervention_proposed(session: AsyncSession, payload: dict) -> None:
    intv_id = payload.get("intervention_id")
    result = await session.execute(select(Intervention).where(Intervention.id == intv_id))
    intv_row = result.scalar_one_or_none()
    if intv_row is None:
        proposed_at_val = payload.get("proposed_at")
        if isinstance(proposed_at_val, str):
            proposed_at_val = datetime.fromisoformat(proposed_at_val)
        intv_row = Intervention(
            id=intv_id,
            case_id=payload["case_id"],
            seq=payload.get("seq", 1),
            type=payload.get("type", "message"),
            channel=payload.get("channel"),
            status="proposed",
            proposed_at=proposed_at_val or now_utc(),
            content=payload.get("content"),
        )
        session.add(intv_row)

async def project_policy_verdict(session: AsyncSession, payload: dict, verdict: str) -> None:
    intv_id = payload.get("intervention_id")
    result = await session.execute(select(Intervention).where(Intervention.id == intv_id))
    intv_row = result.scalar_one_or_none()
    if intv_row is not None:
        intv_row.status = verdict
        intv_row.policy_receipt = payload.get("receipt")

async def project_link_created(session: AsyncSession, payload: dict) -> None:
    link_id = payload.get("link_id")
    result = await session.execute(select(PaymentLink).where(PaymentLink.id == link_id))
    link_row = result.scalar_one_or_none()
    if link_row is None:
        expire_val = payload["expire_by"]
        if isinstance(expire_val, str):
            expire_val = datetime.fromisoformat(expire_val)
        link_row = PaymentLink(
            id=link_id,
            intervention_id=payload["intervention_id"],
            amount_paise=payload["amount_paise"],
            purpose=payload.get("purpose", "recover"),
            expire_by=expire_val,
            status="created",
        )
        session.add(link_row)

async def project_link_paid(session: AsyncSession, payload: dict) -> None:
    link_id = payload.get("rzp_link_id")
    result = await session.execute(select(PaymentLink).where(PaymentLink.id == link_id))
    link_row = result.scalar_one_or_none()
    if link_row is not None:
        link_row.status = "paid"
