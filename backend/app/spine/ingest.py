from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import now_utc
from app.core.logging import logger
from app.models import Event

VALID_ACTORS = {"system", "agent", "policy", "reach", "customer", "sim", "admin"}


async def append_event(
    session: AsyncSession,
    actor: str,
    event_type: str,
    payload: dict[str, Any],
    case_id: str | None = None,
    batch_id: str | None = None,
    dedup_key: str | None = None,
    event_time: datetime | None = None,
) -> Event | None:
    if actor not in VALID_ACTORS:
        actor = "system"

    current_server_time = now_utc()
    effective_event_time = event_time if event_time is not None else current_server_time

    if dedup_key is not None:
        query = select(Event).where(Event.dedup_key == dedup_key)
        result = await session.execute(query)
        existing_event = result.scalar_one_or_none()
        if existing_event is not None:
            logger.info(f"Duplicate event ignored with dedup_key={dedup_key}")
            return None

    event_row = Event(
        ts=effective_event_time,
        ingested_at=current_server_time,
        case_id=case_id,
        batch_id=batch_id,
        actor=actor,
        event_type=event_type,
        dedup_key=dedup_key,
        payload=payload,
    )
    session.add(event_row)
    await session.flush()
    return event_row


async def quarantine_event(
    session: AsyncSession,
    reason: str,
    raw_sha: str,
    payload: dict[str, Any],
) -> Event:
    return await append_event(
        session=session,
        actor="system",
        event_type="event.quarantined",
        payload={"reason": reason, "raw_sha": raw_sha, "raw_payload": payload},
    )
