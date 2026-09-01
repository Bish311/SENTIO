from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.guard.receipt import PolicyReceipt, build_receipt
from app.spine.ingest import append_event
from app.spine.projector import project_event


async def record_verdict(
    session: AsyncSession,
    case_id: str,
    intervention_id: str,
    verdict: str,
    rules_evaluated: list[str],
    violations: list[str],
    extra_context: dict[str, Any] | None,
) -> PolicyReceipt:
    receipt = build_receipt(
        case_id=case_id,
        intervention_id=intervention_id,
        verdict=verdict,
        rules_evaluated=rules_evaluated,
        violations=violations,
        context=extra_context or {},
    )
    event_type = "policy.allowed" if verdict == "ALLOW" else "policy.denied"
    event_row = await append_event(
        session=session,
        actor="policy",
        event_type=event_type,
        case_id=case_id,
        payload={"intervention_id": intervention_id, "receipt": receipt.to_dict()},
    )
    if event_row is not None:
        await project_event(session, event_row)
    return receipt
