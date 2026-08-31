import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, select

from app.core.db import async_session_factory
from app.models import Case, Event, Intervention, PaymentLink, Promise
from app.spine.projector import project_event


async def rebuild_projections_from_events() -> int:
    async with async_session_factory() as session:
        await session.execute(delete(Promise))
        await session.execute(delete(PaymentLink))
        await session.execute(delete(Intervention))
        await session.execute(delete(Case))
        await session.flush()

        events_result = await session.execute(select(Event).order_by(Event.id))
        events = events_result.scalars().all()

        rebuilt_count = 0
        for event in events:
            await project_event(session, event)
            rebuilt_count = rebuilt_count + 1

        await session.commit()
        return rebuilt_count


if __name__ == "__main__":
    count = asyncio.run(rebuild_projections_from_events())
