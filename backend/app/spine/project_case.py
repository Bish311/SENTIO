from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Case, Event


async def project_case_opened(session: AsyncSession, event: Event) -> None:
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

async def project_case_diagnosed(session: AsyncSession, payload: dict) -> None:
    case_id = payload.get("case_id")
    result = await session.execute(select(Case).where(Case.id == case_id))
    case_row = result.scalar_one_or_none()
    if case_row is not None:
        case_row.root_cause = payload.get("root_cause")
        case_row.diagnosis_source = payload.get("source")
        case_row.diagnosis_confidence = payload.get("confidence")
        case_row.decline_code = payload.get("decline_code")
        case_row.state = "DIAGNOSED"

async def project_case_closed(session: AsyncSession, payload: dict, closed_ts: datetime) -> None:
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

async def project_case_prevented(session: AsyncSession, payload: dict) -> None:
    case_id = payload.get("case_id")
    result = await session.execute(select(Case).where(Case.id == case_id))
    case_row = result.scalar_one_or_none()
    if case_row is not None:
        case_row.state = "PREVENTED"
        case_row.outcome = "prevented"
