import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.db import Base, async_session_factory, engine
from scripts.experiment_metrics import calculate_experiment_metrics
from scripts.experiment_runner import run_experiment_batch
from scripts.rebuild_projections import rebuild_projections_from_events


async def verify_experiment_reproducibility() -> bool:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        res_1 = await run_experiment_batch(session, seed=42, n_customers=50)
        metrics_1 = await calculate_experiment_metrics(session, res_1["batch_id"])

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        res_2 = await run_experiment_batch(session, seed=42, n_customers=50)
        metrics_2 = await calculate_experiment_metrics(session, res_2["batch_id"])

    assert metrics_1["arm_a"]["recovered_paise"] == metrics_2["arm_a"]["recovered_paise"]
    assert metrics_1["arm_b"]["recovered_paise"] == metrics_2["arm_b"]["recovered_paise"]
    assert metrics_1["lift"] == metrics_2["lift"]
    assert metrics_1["guardrail_blocks"] == metrics_2["guardrail_blocks"]

    rebuilt_count = await rebuild_projections_from_events()
    assert rebuilt_count > 0

    print("Seeded reproducibility and projection rebuild verified successfully.")
    return True


if __name__ == "__main__":
    success = asyncio.run(verify_experiment_reproducibility())
    if not success:
        sys.exit(1)
