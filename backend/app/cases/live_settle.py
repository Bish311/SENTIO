from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Case, PaymentLink
from app.spine.ingest import append_event
from app.spine.projector import project_event


async def handle_live_payment_success(session: AsyncSession, payload: dict) -> None:
    payment_entity = payload.get("payment", {}).get("entity", {})
    link_entity = payload.get("payment_link", {}).get("entity", {})
    link_id = link_entity.get("id") or payment_entity.get("payment_link_id")
    notes = payment_entity.get("notes", {}) or link_entity.get("notes", {})
    case_id = notes.get("case_id")

    if not case_id and link_id:
        res = await session.execute(select(PaymentLink).where(PaymentLink.id == link_id))
        pl = res.scalar_one_or_none()
        if pl and pl.intervention:
            case_id = pl.intervention.case_id

    if not case_id:
        sub_id = notes.get("subscription_id")
        if sub_id:
            q = select(Case).where(Case.subscription_id == sub_id).where(Case.state.in_(["opened", "diagnosed", "in_recovery"]))
            res = await session.execute(q.order_by(Case.opened_at.desc()).limit(1))
            c_found = res.scalar_one_or_none()
            if c_found:
                case_id = c_found.id

    c = await session.get(Case, case_id) if case_id else None
    amount = int(payment_entity.get("amount") or link_entity.get("amount") or (c.amount_at_risk_paise if c else 0))

    if c:
        ev = await append_event(
            session, "gateway", "payment_link.paid",
            {"case_id": c.id, "amount_paise": amount, "rzp_link_id": link_id}, case_id=c.id
        )
        if ev:
            await project_event(session, ev)
        c_ev = await append_event(
            session, "system", "case.closed",
            {"case_id": c.id, "outcome": "recovered", "recovered_paise": amount}, case_id=c.id
        )
        if c_ev:
            await project_event(session, c_ev)
    else:
        await append_event(
            session, "gateway", "payment.unmatched",
            {"link_id": link_id, "amount_paise": amount, "notes": notes}
        )
    await session.commit()
