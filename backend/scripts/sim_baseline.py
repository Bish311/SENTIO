import random
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.mirror.responder import sample_customer_outcome
from app.models import Case
from app.spine.ingest import append_event
from app.spine.projector import project_event


async def run_baseline_case(
    session: AsyncSession,
    case_obj: Case,
    decline_code: str,
    persona: dict[str, Any],
    rng: random.Random,
    batch_id: str,
) -> None:
    recovered = False
    for attempt in [1, 2, 3]:
        outcome = sample_customer_outcome(
            root_cause=decline_code,
            arm="baseline",
            persona=persona,
            channel_matched=False,
            seq=attempt,
            rng=rng,
        )
        if outcome == "paid":
            recovered = True
            rec_payload = {
                "subscription_id": case_obj.subscription_id,
                "amount_paise": case_obj.amount_at_risk_paise,
            }
            rec_ev = await append_event(
                session=session,
                actor="system",
                event_type="payment.captured",
                case_id=case_obj.id,
                batch_id=batch_id,
                payload=rec_payload,
            )
            if rec_ev is not None:
                await project_event(session, rec_ev)

            close_payload = {
                "case_id": case_obj.id,
                "outcome": "recovered",
                "recovered_paise": case_obj.amount_at_risk_paise,
            }
            close_ev = await append_event(
                session=session,
                actor="agent",
                event_type="case.closed",
                case_id=case_obj.id,
                batch_id=batch_id,
                payload=close_payload,
            )
            if close_ev is not None:
                await project_event(session, close_ev)
            break

    if not recovered:
        fail_payload = {
            "case_id": case_obj.id,
            "outcome": "exhausted",
            "recovered_paise": 0,
        }
        close_ev = await append_event(
            session=session,
            actor="agent",
            event_type="case.closed",
            case_id=case_obj.id,
            batch_id=batch_id,
            payload=fail_payload,
        )
        if close_ev is not None:
            await project_event(session, close_ev)
