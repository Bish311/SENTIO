from typing import Any

import ulid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import now_utc
from app.guard.engine import evaluate_proposal
from app.models import Case, Subscription
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

    prevented_count = 0
    now_dt = now_utc()

    for sub in subs:
        existing_case = await session.execute(
            select(Case)
            .where(Case.subscription_id == sub.id)
            .where(Case.kind == "prevention")
            .where(Case.state.in_(["DETECTED", "INTERVENING"]))
        )
        if existing_case.scalar_one_or_none() is not None:
            continue

        case_id = f"case_prev_{str(ulid.ULID()).lower()}"
        open_event = await append_event(
            session=session,
            actor="system",
            event_type="case.opened",
            case_id=case_id,
            payload={
                "case_id": case_id,
                "subscription_id": sub.id,
                "customer_id": sub.customer_id,
                "kind": "prevention",
                "amount_at_risk_paise": sub.amount_paise,
                "arm": sub.arm,
                "batch_id": sub.batch_id,
            },
        )
        if open_event is not None:
            await project_event(session, open_event)

        intv_id = f"intv_{str(ulid.ULID()).lower()}"
        receipt = await evaluate_proposal(
            session=session,
            case_id=case_id,
            intervention_id=intv_id,
            action_type="update_card_link",
            proposed_paise=sub.amount_paise,
            debt_paise=sub.amount_paise,
            proposed_time_utc=now_dt,
            confidence=1.0,
        )

        if receipt.verdict == "ALLOW":
            prev_event = await append_event(
                session=session,
                actor="agent",
                event_type="case.prevented",
                case_id=case_id,
                payload={"case_id": case_id},
            )
            if prev_event is not None:
                await project_event(session, prev_event)
            prevented_count = prevented_count + 1

    await append_event(
        session=session,
        actor="agent",
        event_type="sweep.run",
        payload={"found_budget_risk": len(subs), "prevented_count": prevented_count},
    )
    return {"found_budget_risk": len(subs), "prevented_count": prevented_count}
