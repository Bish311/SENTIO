import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.cases.engine import handle_payment_failed
from app.core.db import Base, async_session_factory, engine
from app.mirror.batch_gen import create_batch_world
from app.mirror.replay import build_payment_failed_payload
from app.models import Case, Subscription
from app.spine.ingest import append_event
from app.spine.projector import project_event
from app.spine.verify import verify_webhook_signature
from scripts.rebuild_projections import rebuild_projections_from_events


async def run_smoke_test() -> bool:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        batch_result = await create_batch_world(session, seed=123, n_customers=20)
        batch_id = str(batch_result["batch_id"])

        subs_query = select(Subscription).where(Subscription.batch_id == batch_id).limit(10)
        subs_res = await session.execute(subs_query)
        subs = subs_res.scalars().all()

        for sub in subs:
            payload_bytes, sig = build_payment_failed_payload(
                subscription_id=sub.id,
                amount_paise=sub.amount_paise,
                decline_family="insufficient_funds",
                batch_id=batch_id,
            )
            assert verify_webhook_signature(payload_bytes, sig) is True

            parsed = json.loads(payload_bytes.decode("utf-8"))
            event = await append_event(
                session=session,
                actor="system",
                event_type="payment.failed",
                payload=parsed,
                batch_id=batch_id,
                dedup_key=f"smoke_{sub.id}",
            )
            if event is not None:
                await handle_payment_failed(
                    session=session,
                    subscription_id=sub.id,
                    amount_paise=sub.amount_paise,
                    decline_code="insufficient_funds",
                    error_details={},
                    batch_id=batch_id,
                )
                await project_event(session, event)

        await session.commit()

        cases_res = await session.execute(select(Case).where(Case.batch_id == batch_id))
        cases = cases_res.scalars().all()
        assert len(cases) > 0

    rebuilt = await rebuild_projections_from_events()
    assert rebuilt > 0
    return True


if __name__ == "__main__":
    success = asyncio.run(run_smoke_test())
    if not success:
        sys.exit(1)
