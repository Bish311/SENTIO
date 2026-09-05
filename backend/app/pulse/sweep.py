from typing import Any

import ulid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.chrono.timing import calculate_next_legal_window
from app.core.clock import now_utc
from app.guard.engine import evaluate_proposal
from app.models import Case, Customer, Subscription
from app.spine.ingest import append_event
from app.spine.projector import project_event


async def run_prevention_sweep(session: AsyncSession) -> dict[str, Any]:
    query = (
        select(Subscription)
        .where(Subscription.status == "active")
        .where(Subscription.retry_budget_used >= 2)
    )
    res = await session.execute(query)
    subs = res.scalars().all()

    prevented_items: list[dict[str, Any]] = []
    total_avoided_paise = 0
    now_dt = now_utc()
    legal_win = calculate_next_legal_window(now_dt)

    for sub in subs:
        existing_case = await session.execute(
            select(Case)
            .where(Case.subscription_id == sub.id)
            .where(Case.kind == "prevention")
            .where(Case.state.in_(["DETECTED", "INTERVENING", "closed", "settled"]))
        )
        if existing_case.scalar_one_or_none() is not None:
            continue

        case_id = f"case_prev_{str(ulid.ULID()).lower()}"
        payload = {
            "case_id": case_id, "subscription_id": sub.id, "customer_id": sub.customer_id,
            "kind": "prevention", "amount_at_risk_paise": sub.amount_paise, "arm": sub.arm, "batch_id": sub.batch_id,
        }
        open_event = await append_event(session, "system", "case.opened", payload, case_id=case_id)
        if open_event is not None:
            await project_event(session, open_event)

        intv_id = f"intv_{str(ulid.ULID()).lower()}"
        receipt = await evaluate_proposal(
            session=session, case_id=case_id, intervention_id=intv_id, action_type="update_card_link",
            proposed_paise=sub.amount_paise, debt_paise=sub.amount_paise, proposed_time_utc=legal_win,
            confidence=1.0, customer_opted_out=False,
        )

        cust = await session.get(Customer, sub.customer_id)
        cust_name = cust.name if cust else "Subscriber"
        cust_phone = cust.phone if cust else "+919800000000"
        msg = f"Namaste {cust_name}, aapka {sub.plan_id} subscription card retry limit par hai. Interruption se bachne ke liye payment method yahan update karein: https://rzp.io/l/upd_{sub.id[-6:]}. STOP reply karein to opt-out."

        if receipt.verdict == "ALLOW":
            await append_event(session, "agent", "prevention.outreach_drafted", {"channel": "whatsapp", "message": msg, "scheduled_window_ist": legal_win.strftime("%d %b, %H:%M IST")}, case_id=case_id)
            prev_event = await append_event(session, "agent", "case.prevented", {"case_id": case_id, "amount_paise": sub.amount_paise}, case_id=case_id)
            if prev_event is not None:
                await project_event(session, prev_event)
            total_avoided_paise += sub.amount_paise
            prevented_items.append({
                "case_id": case_id, "subscription_id": sub.id, "customer_id": sub.customer_id,
                "customer_name": cust_name, "customer_phone": cust_phone, "plan_id": sub.plan_id,
                "amount_paise": sub.amount_paise, "receipt_id": receipt.receipt_id,
                "verdict": receipt.verdict, "scheduled_window_ist": legal_win.strftime("%d %b, %H:%M IST"),
                "outreach_message": msg, "risk_vector": "MANDATE_RETRY_CEILING", "retries_used": sub.retry_budget_used,
            })

    await append_event(
        session=session, actor="agent", event_type="sweep.run",
        payload={"found_budget_risk": len(subs), "prevented_count": len(prevented_items), "avoided_paise": total_avoided_paise},
    )
    return {
        "found_budget_risk": len(subs), "prevented_count": len(prevented_items),
        "avoided_paise": total_avoided_paise, "prevented_items": prevented_items,
    }
