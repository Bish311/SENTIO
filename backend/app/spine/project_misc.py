from datetime import date

import ulid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Case, Customer, Promise, Subscription


async def project_ptp_booked(session: AsyncSession, payload: dict, event_id: int) -> None:
    promise_id = payload.get("promise_id") or f"ptp_{str(ulid.ULID()).lower()}"
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

async def project_ptp_status(session: AsyncSession, payload: dict, status: str) -> None:
    promise_id = payload.get("promise_id")
    result = await session.execute(select(Promise).where(Promise.id == promise_id))
    prom_row = result.scalar_one_or_none()
    if prom_row is not None:
        prom_row.status = status

async def project_optout(session: AsyncSession, payload: dict) -> None:
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

async def project_retry_executed(session: AsyncSession, payload: dict) -> None:
    sub_id = payload.get("subscription_id")
    result = await session.execute(select(Subscription).where(Subscription.id == sub_id))
    sub = result.scalar_one_or_none()
    if sub is not None:
        sub.retry_budget_used = sub.retry_budget_used + 1
