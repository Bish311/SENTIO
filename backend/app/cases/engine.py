import ulid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Case, Subscription
from app.spine.ingest import append_event
from app.spine.projector import project_event


async def handle_payment_failed(
    session: AsyncSession,
    subscription_id: str,
    amount_paise: int,
    decline_code: str | None,
    error_details: dict,
    arm: str = "agent",
    batch_id: str | None = None,
) -> Case:
    sub_query = select(Subscription).where(Subscription.id == subscription_id)
    sub_res = await session.execute(sub_query)
    subscription = sub_res.scalar_one_or_none()

    customer_id = subscription.customer_id if subscription is not None else ""
    effective_arm = subscription.arm if subscription is not None else arm
    effective_batch_id = subscription.batch_id if subscription is not None else (batch_id or "")

    case_query = select(Case).where(
        Case.subscription_id == subscription_id,
        Case.state.notin_(["RECOVERED", "CLOSED_LOST", "HUMAN_HANDOFF", "PREVENTED"]),
    )
    case_res = await session.execute(case_query)
    existing_case = case_res.scalar_one_or_none()

    if existing_case is not None:
        return existing_case

    case_id = f"case_{str(ulid.ULID()).lower()}"
    opened_event = await append_event(
        session=session,
        actor="agent",
        event_type="case.opened",
        case_id=case_id,
        batch_id=effective_batch_id,
        payload={
            "case_id": case_id,
            "subscription_id": subscription_id,
            "customer_id": customer_id,
            "amount_at_risk_paise": amount_paise,
            "decline_code": decline_code,
            "error_details": error_details,
            "arm": effective_arm,
            "batch_id": effective_batch_id,
            "kind": "recovery",
        },
    )

    if opened_event is not None:
        await project_event(session, opened_event)

    case_fetch = await session.execute(select(Case).where(Case.id == case_id))
    return case_fetch.scalar_one()
