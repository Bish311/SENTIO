from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Case,
    Customer,
    Event,
    Intervention,
    PaymentLink,
    Promise,
    Subscription,
)


async def project_event(session: AsyncSession, event: Event) -> None:
    event_type = event.event_type
    payload = event.payload

    if event_type == "case.opened":
        await _project_case_opened(session, event)
    elif event_type == "case.diagnosed":
        await _project_case_diagnosed(session, payload)
    elif event_type == "case.closed":
        await _project_case_closed(session, payload, event.ts)
    elif event_type == "case.prevented":
        await _project_case_prevented(session, payload)
    elif event_type == "intervention.proposed":
        await _project_intervention_proposed(session, payload)
    elif event_type == "policy.allowed":
        await _project_policy_verdict(session, payload, "allowed")
    elif event_type == "policy.denied":
        await _project_policy_verdict(session, payload, "denied")
    elif event_type == "link.created":
        await _project_link_created(session, payload)
    elif event_type == "payment_link.paid":
        await _project_link_paid(session, payload)
    elif event_type == "ptp.booked":
        await _project_ptp_booked(session, payload, event.id)
    elif event_type == "ptp.kept":
        await _project_ptp_status(session, payload, "kept")
    elif event_type == "ptp.broken":
        await _project_ptp_status(session, payload, "broken")
    elif event_type == "optout.requested":
        await _project_optout(session, payload)
    elif event_type == "retry.executed":
        await _project_retry_executed(session, payload)


async def _project_case_opened(session: AsyncSession, event: Event) -> None:
    payload = event.payload
    case_id = payload.get("case_id")
    if not case_id:
        return

    result = await session.execute(select(Case).where(Case.id == case_id))
    case_row = result.scalar_one_or_none()
    if case_row is None:
        case_row = Case(
            id=case_id,
            subscription_id=payload["subscription_id"],
            customer_id=payload.get("customer_id", ""),
            state="DETECTED",
            kind=payload.get("kind", "recovery"),
            amount_at_risk_paise=payload.get("amount_at_risk_paise", 0),
            arm=payload.get("arm", "agent"),
            batch_id=payload.get("batch_id", ""),
            opened_at=event.ts,
        )
        session.add(case_row)
    else:
        case_row.state = "DETECTED"


async def _project_case_diagnosed(session: AsyncSession, payload: dict) -> None:
    case_id = payload.get("case_id")
    result = await session.execute(select(Case).where(Case.id == case_id))
    case_row = result.scalar_one_or_none()
    if case_row is not None:
        case_row.root_cause = payload.get("root_cause")
        case_row.diagnosis_source = payload.get("source")
        case_row.diagnosis_confidence = payload.get("confidence")
        case_row.decline_code = payload.get("decline_code")
        case_row.state = "DIAGNOSED"


async def _project_case_closed(session: AsyncSession, payload: dict, closed_ts: datetime) -> None:
    case_id = payload.get("case_id")
    result = await session.execute(select(Case).where(Case.id == case_id))
    case_row = result.scalar_one_or_none()
    if case_row is not None:
        outcome = payload.get("outcome", "closed_lost")
        case_row.outcome = outcome
        case_row.recovered_paise = payload.get("recovered_paise", 0)
        case_row.closed_at = closed_ts
        if outcome == "recovered":
            case_row.state = "RECOVERED"
        elif outcome == "human_handoff":
            case_row.state = "HUMAN_HANDOFF"
        else:
            case_row.state = "CLOSED_LOST"


async def _project_case_prevented(session: AsyncSession, payload: dict) -> None:
    case_id = payload.get("case_id")
    result = await session.execute(select(Case).where(Case.id == case_id))
    case_row = result.scalar_one_or_none()
    if case_row is not None:
        case_row.state = "PREVENTED"
        case_row.outcome = "prevented"


async def _project_intervention_proposed(session: AsyncSession, payload: dict) -> None:
    intv_id = payload.get("intervention_id")
    result = await session.execute(select(Intervention).where(Intervention.id == intv_id))
    intv_row = result.scalar_one_or_none()
    if intv_row is None:
        intv_row = Intervention(
            id=intv_id,
            case_id=payload["case_id"],
            seq=payload.get("seq", 1),
            type=payload.get("type", "message"),
            channel=payload.get("channel"),
            status="proposed",
            proposed_at=payload.get("proposed_at"),
            content=payload.get("content"),
        )
        session.add(intv_row)


async def _project_policy_verdict(session: AsyncSession, payload: dict, verdict: str) -> None:
    intv_id = payload.get("intervention_id")
    result = await session.execute(select(Intervention).where(Intervention.id == intv_id))
    intv_row = result.scalar_one_or_none()
    if intv_row is not None:
        intv_row.status = verdict
        intv_row.policy_receipt = payload.get("receipt")


async def _project_link_created(session: AsyncSession, payload: dict) -> None:
    link_id = payload.get("link_id")
    result = await session.execute(select(PaymentLink).where(PaymentLink.id == link_id))
    link_row = result.scalar_one_or_none()
    if link_row is None:
        link_row = PaymentLink(
            id=link_id,
            intervention_id=payload["intervention_id"],
            amount_paise=payload["amount_paise"],
            purpose=payload.get("purpose", "recover"),
            expire_by=payload["expire_by"],
            status="created",
        )
        session.add(link_row)


async def _project_link_paid(session: AsyncSession, payload: dict) -> None:
    link_id = payload.get("rzp_link_id")
    result = await session.execute(select(PaymentLink).where(PaymentLink.id == link_id))
    link_row = result.scalar_one_or_none()
    if link_row is not None:
        link_row.status = "paid"


async def _project_ptp_booked(session: AsyncSession, payload: dict, event_id: int) -> None:
    promise_id = payload.get("promise_id")
    result = await session.execute(select(Promise).where(Promise.id == promise_id))
    prom_row = result.scalar_one_or_none()
    if prom_row is None:
        promised_date_val = payload["promised_date"]
        if isinstance(promised_date_val, str):
            promised_date_val = date.fromisoformat(promised_date_val)
        prom_row = Promise(
            id=promise_id,
            case_id=payload["case_id"],
            promised_date=promised_date_val,
            amount_paise=payload.get("amount_paise"),
            confidence=payload.get("confidence", 1.0),
            source_event_id=event_id,
            status="booked",
        )
        session.add(prom_row)


async def _project_ptp_status(session: AsyncSession, payload: dict, status: str) -> None:
    promise_id = payload.get("promise_id")
    result = await session.execute(select(Promise).where(Promise.id == promise_id))
    prom_row = result.scalar_one_or_none()
    if prom_row is not None:
        prom_row.status = status


async def _project_optout(session: AsyncSession, payload: dict) -> None:
    case_id = payload.get("case_id")
    result = await session.execute(select(Case).where(Case.id == case_id))
    case_row = result.scalar_one_or_none()
    if case_row is not None:
        cust_result = await session.execute(
            select(Customer).where(Customer.id == case_row.customer_id)
        )
        customer = cust_result.scalar_one_or_none()
        if customer is not None:
            customer.opted_out = True


async def _project_retry_executed(session: AsyncSession, payload: dict) -> None:
    sub_id = payload.get("subscription_id")
    result = await session.execute(select(Subscription).where(Subscription.id == sub_id))
    sub = result.scalar_one_or_none()
    if sub is not None:
        sub.retry_budget_used = sub.retry_budget_used + 1
