from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models import Event

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/recent")
async def get_recent_events(
    limit: int = Query(default=30, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    query = select(Event).order_by(desc(Event.id)).limit(limit)
    result = await session.execute(query)
    events = result.scalars().all()

    recent: list[dict[str, Any]] = []
    for ev in events:
        recent.append(
            {
                "id": ev.id,
                "ts": ev.ts.isoformat(),
                "actor": ev.actor,
                "event_type": ev.event_type,
                "case_id": ev.case_id,
                "payload": ev.payload,
            }
        )
    return recent
