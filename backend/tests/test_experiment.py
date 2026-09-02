import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from scripts.experiment_metrics import calculate_experiment_metrics
from scripts.experiment_runner import run_experiment_batch


@pytest.mark.asyncio
async def test_experiment_batch_execution(db_session: AsyncSession) -> None:
    res = await run_experiment_batch(db_session, seed=101, n_customers=10)
    batch_id = res["batch_id"]
    assert batch_id.startswith("batch_")

    metrics = await calculate_experiment_metrics(db_session, batch_id)
    assert metrics["batch_id"] == batch_id
    assert "arm_a" in metrics
    assert "arm_b" in metrics
    assert metrics["arm_a"]["total_cases"] == 10
    assert metrics["arm_b"]["total_cases"] == 10
    assert metrics["lift"] >= 0.0
