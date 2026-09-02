import random
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.cases.engine import handle_payment_failed
from app.mirror.batch_gen import create_batch_world
from app.mirror.probabilities import FAILURE_MIX
from app.mirror.replay import build_payment_failed_payload
from app.models import Customer, Subscription
from app.pulse.sweep import run_prevention_sweep
from app.spine.ingest import append_event
from app.spine.projector import project_event
from scripts.sim_agent import run_agent_case
from scripts.sim_baseline import run_baseline_case


async def run_experiment_batch(
    session: AsyncSession,
    seed: int = 42,
    n_customers: int = 200,
) -> dict[str, Any]:
    rng = random.Random(seed)
    batch_info = await create_batch_world(session, seed=seed, n_customers=n_customers)
    batch_id = str(batch_info["batch_id"])

    subs_res = await session.execute(
        select(Subscription).where(Subscription.batch_id == batch_id)
    )
    all_subs = subs_res.scalars().all()

    cust_res = await session.execute(
        select(Customer).where(Customer.sim_profile.isnot(None))
    )
    cust_map = {c.id: c.sim_profile for c in cust_res.scalars().all()}

    decline_families = list(FAILURE_MIX.keys())
    decline_weights = list(FAILURE_MIX.values())

    sub_failures: dict[str, str] = {}
    for sub in all_subs:
        base_id = sub.id.replace("_agent", "").replace("_baseline", "")
        if base_id not in sub_failures:
            sub_failures[base_id] = rng.choices(decline_families, weights=decline_weights, k=1)[0]

    for sub in all_subs:
        base_id = sub.id.replace("_agent", "").replace("_baseline", "")
        decline_family = sub_failures[base_id]

        payload_bytes, _ = build_payment_failed_payload(
            subscription_id=sub.id,
            amount_paise=sub.amount_paise,
            decline_family=decline_family,
            batch_id=batch_id,
        )

        fail_event = await append_event(
            session=session,
            actor="system",
            event_type="payment.failed",
            payload={
                "subscription_id": sub.id,
                "amount_paise": sub.amount_paise,
                "decline_code": decline_family,
                "batch_id": batch_id,
            },
            batch_id=batch_id,
            dedup_key=f"fail_{sub.id}",
        )
        if fail_event is not None:
            await project_event(session, fail_event)

        case_obj = await handle_payment_failed(
            session=session,
            subscription_id=sub.id,
            amount_paise=sub.amount_paise,
            decline_code=decline_family,
            error_details={},
            arm=sub.arm,
            batch_id=batch_id,
        )

        persona = cust_map.get(sub.customer_id, {})
        if sub.arm == "baseline":
            await run_baseline_case(session, case_obj, decline_family, persona, rng, batch_id)
        else:
            await run_agent_case(session, case_obj, decline_family, persona, rng, batch_id)

    await run_prevention_sweep(session)
    await session.commit()

    return {"batch_id": batch_id}
