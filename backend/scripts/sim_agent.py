import random
from typing import Any

import ulid
from sqlalchemy.ext.asyncio import AsyncSession

from app.cases.ladders import LADDERS
from app.chrono.timing import calculate_next_legal_window
from app.core.clock import now_utc
from app.guard.engine import evaluate_proposal
from app.lens.diagnose import diagnose_payment_failure
from app.mirror.responder import sample_customer_outcome
from app.models import Case
from app.spine.ingest import append_event
from app.spine.projector import project_event


async def run_agent_case(
    session: AsyncSession,
    case_obj: Case,
    decline_code: str,
    persona: dict[str, Any],
    rng: random.Random,
    batch_id: str,
) -> None:
    root_cause, confidence, _, _ = await diagnose_payment_failure(
        session, case_id=case_obj.id, decline_code=decline_code, force_llm=False
    )
    ladder_steps = LADDERS.get(root_cause, LADDERS["other"])

    recovered = False
    now_dt = now_utc()
    legal_dt = calculate_next_legal_window(now_dt)

    for step in ladder_steps:
        action_type = step["type"]
        if action_type == "handoff":
            break

        intv_id = f"intv_{str(ulid.ULID()).lower()}"
        channel = persona.get("channel_pref", "whatsapp")

        prop_payload = {
            "intervention_id": intv_id,
            "case_id": case_obj.id,
            "action_type": action_type,
            "channel": channel,
            "seq": step["seq"],
        }
        prop_ev = await append_event(
            session=session,
            actor="agent",
            event_type="intervention.proposed",
            case_id=case_obj.id,
            batch_id=batch_id,
            payload=prop_payload,
        )
        if prop_ev is not None:
            await project_event(session, prop_ev)

        raw_receipt = await evaluate_proposal(
            session=session,
            case_id=case_obj.id,
            intervention_id=intv_id,
            action_type=action_type,
            proposed_paise=case_obj.amount_at_risk_paise,
            debt_paise=case_obj.amount_at_risk_paise,
            proposed_time_utc=now_dt,
            confidence=confidence,
        )

        if raw_receipt.verdict != "ALLOW":
            den_payload = {
                "intervention_id": intv_id,
                "case_id": case_obj.id,
                "receipt": raw_receipt.model_dump(mode="json"),
            }
            den_ev = await append_event(
                session=session,
                actor="policy",
                event_type="policy.denied",
                case_id=case_obj.id,
                batch_id=batch_id,
                payload=den_payload,
            )
            if den_ev is not None:
                await project_event(session, den_ev)

            sched_ev = await append_event(
                session=session,
                actor="chrono",
                event_type="chrono.rescheduled",
                case_id=case_obj.id,
                batch_id=batch_id,
                payload={
                    "intervention_id": intv_id,
                    "rescheduled_for": "09:15 AM IST (Next Legal Window)",
                    "reason": "Quiet Hours: Night messaging paused until 09:15 IST",
                },
            )
            if sched_ev is not None:
                await project_event(session, sched_ev)

        receipt = await evaluate_proposal(
            session=session,
            case_id=case_obj.id,
            intervention_id=intv_id,
            action_type=action_type,
            proposed_paise=case_obj.amount_at_risk_paise,
            debt_paise=case_obj.amount_at_risk_paise,
            proposed_time_utc=legal_dt,
            confidence=confidence,
        )

        if receipt.verdict == "ALLOW":
            allow_payload = {
                "intervention_id": intv_id,
                "case_id": case_obj.id,
                "receipt": receipt.model_dump(mode="json"),
            }
            allow_ev = await append_event(
                session=session,
                actor="policy",
                event_type="policy.allowed",
                case_id=case_obj.id,
                batch_id=batch_id,
                payload=allow_payload,
            )
            if allow_ev is not None:
                await project_event(session, allow_ev)

        if receipt.verdict != "ALLOW":
            continue

        chan_pref = persona.get("channel_pref", "whatsapp")
        channel_matched = (channel == chan_pref)
        outcome = sample_customer_outcome(
            root_cause=root_cause,
            arm="agent",
            persona=persona,
            channel_matched=channel_matched,
            seq=step["seq"],
            rng=rng,
        )

        if outcome in ("paid", "promised"):
            recovered = True
            if outcome == "promised":
                ptp_payload = {
                    "case_id": case_obj.id,
                    "promised_date": "2026-09-05",
                    "amount_paise": case_obj.amount_at_risk_paise,
                }
                ptp_ev = await append_event(
                    session=session,
                    actor="chrono",
                    event_type="ptp.booked",
                    case_id=case_obj.id,
                    batch_id=batch_id,
                    payload=ptp_payload,
                )
                if ptp_ev is not None:
                    await project_event(session, ptp_ev)

            paid_payload = {
                "case_id": case_obj.id,
                "amount_paise": case_obj.amount_at_risk_paise,
            }
            paid_ev = await append_event(
                session=session,
                actor="customer",
                event_type="payment_link.paid",
                case_id=case_obj.id,
                batch_id=batch_id,
                payload=paid_payload,
            )
            if paid_ev is not None:
                await project_event(session, paid_ev)

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
        elif outcome == "opted_out":
            opt_payload = {
                "case_id": case_obj.id,
                "customer_id": case_obj.customer_id,
            }
            opt_ev = await append_event(
                session=session,
                actor="customer",
                event_type="optout.requested",
                case_id=case_obj.id,
                batch_id=batch_id,
                payload=opt_payload,
            )
            if opt_ev is not None:
                await project_event(session, opt_ev)
            break

    if not recovered:
        close_fail_payload = {
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
            payload=close_fail_payload,
        )
        if close_ev is not None:
            await project_event(session, close_ev)
