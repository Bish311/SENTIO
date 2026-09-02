import random
from typing import Any

import ulid
from sqlalchemy.ext.asyncio import AsyncSession

from app.mirror.personas import generate_personas
from app.mirror.probabilities import FAILURE_MIX, PRICE_POINTS_PAISE
from app.models import Batch, Customer, Subscription


async def create_batch_world(
    session: AsyncSession,
    seed: int = 42,
    n_customers: int = 200,
) -> dict[str, Any]:
    rng = random.Random(seed)
    batch_id = f"batch_{str(ulid.ULID()).lower()}"

    batch_row = Batch(
        id=batch_id,
        seed=seed,
        n_customers=n_customers,
        failure_mix=FAILURE_MIX,
        config={"seed": seed, "n_customers": n_customers},
        status="created",
    )
    session.add(batch_row)

    personas = generate_personas(n_customers, seed)

    created_customers = 0
    created_subscriptions = 0

    for persona in personas:
        cust_id = persona["customer_id"]
        customer_row = Customer(
            id=cust_id,
            name=persona["name"],
            email=persona["email"],
            phone=persona["phone"],
            locale=persona["locale"],
            opted_out=False,
            sim_profile=persona,
        )
        session.add(customer_row)
        created_customers = created_customers + 1

        price_paise = rng.choice(PRICE_POINTS_PAISE)
        sub_id = f"sub_{cust_id[5:]}"
        plan_id = f"plan_{price_paise // 100}"

        for arm in ["agent", "baseline"]:
            sub_row = Subscription(
                id=f"{sub_id}_{arm}",
                customer_id=cust_id,
                plan_id=plan_id,
                amount_paise=price_paise,
                status="active",
                arm=arm,
                batch_id=batch_id,
            )
            session.add(sub_row)
            created_subscriptions = created_subscriptions + 1

    await session.flush()
    return {
        "batch_id": batch_id,
        "customers_count": created_customers,
        "subscriptions_count": created_subscriptions,
    }
