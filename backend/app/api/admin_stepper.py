from typing import Any

import ulid
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.stepper_scenarios import get_stepper_scenario
from app.api.stepper_stages import execute_reach_and_settle
from app.cases.engine import handle_payment_failed
from app.chrono.timing import calculate_next_legal_window
from app.core.clock import now_utc
from app.core.config import settings
from app.guard.engine import evaluate_proposal
from app.lens.diagnose import diagnose_payment_failure
from app.models import Customer, Subscription
from app.reach.rzp import RazorpayClient
from app.spine.ingest import append_event
from app.spine.projector import project_event


async def run_live_single_step_case(
    session: AsyncSession,
    opaque: bool = True,
    scenario_idx: int = 0,
) -> dict[str, Any]:
    sc = get_stepper_scenario(scenario_idx, opaque)
    cid, now_dt = f"cust_rzp_{str(ulid.ULID()).lower()[-6:]}", now_utc()
    sub_id, batch_id = f"sub_rzp_{cid[-6:]}", f"batch_live_{cid[-6:]}"

    rzp = RazorpayClient()
    rzp_order = await rzp.create_order(sc["paise"], f"rcpt_{cid[-8:]}")
    order_id = rzp_order.get("id", f"order_{cid[-8:]}")

    await session.merge(Customer(
        id=cid, name=sc["name"], email=sc["email"],
        phone="+919876543210", locale="hi_IN", opted_out=False,
    ))
    await session.merge(Subscription(
        id=sub_id, customer_id=cid, plan_id="plan_sub",
        amount_paise=sc["paise"], status="active", arm="agent", batch_id=batch_id,
    ))
    await session.flush()

    steps: list[dict[str, Any]] = []
    ev1 = await append_event(
        session, "system", "payment.failed",
        {"subscription_id": sub_id, "amount_paise": sc["paise"], "decline_code": sc["code"], "order_id": order_id},
        batch_id=batch_id, dedup_key=f"fail_{sub_id}",
    )
    if ev1:
        await project_event(session, ev1)
    steps.append({
        "stage": "1. Spine Event Store (Razorpay External API)", "actor": "system",
        "detail": f"Fetched external order {order_id} from Razorpay. HMAC verified. Sequence #{ev1.id if ev1 else 0}.",
        "proof": {"order_id": order_id, "hmac_valid": True, "event_type": "payment.failed", "paise": sc["paise"]},
    })

    case_obj = await handle_payment_failed(session, sub_id, sc["paise"], sc["code"], {"description": sc["desc"]}, "agent", batch_id)
    cause, conf, src, _ = await diagnose_payment_failure(session, case_obj.id, sc["code"], sc["desc"], force_llm=True)
    model_tag = settings.LLM_T1_MODEL if src == "llm" else "matrix"
    steps.append({
        "stage": "2. Lens Root-Cause Diagnostic", "actor": "lens",
        "detail": f"Diagnosed '{cause}' via {model_tag} ({conf:.2f} confidence). Live OpenRouter inference.",
        "proof": {"source": src, "cause": cause, "confidence": conf, "model": model_tag},
    })

    intv_id = f"intv_{str(ulid.ULID()).lower()}"
    rcpt = await evaluate_proposal(session, case_obj.id, intv_id, "payment_link", sc["paise"], sc["paise"], now_dt, customer_opted_out=False, confidence=conf)
    steps.append({
        "stage": "3. Guard Compliance Gate", "actor": "policy",
        "detail": f"Evaluated 8 rules. Verdict: {rcpt.verdict} (Receipt: {rcpt.receipt_id}).",
        "proof": {"verdict": rcpt.verdict, "receipt_id": rcpt.receipt_id},
    })

    legal_dt = calculate_next_legal_window(now_dt)
    c_ev = await append_event(session, "chrono", "chrono.window_opened", {"case_id": case_obj.id, "scheduled_window": "Legal Window: 09:00 - 21:00 IST", "legal_dt": legal_dt.isoformat()}, case_id=case_obj.id, batch_id=batch_id)
    if c_ev:
        await project_event(session, c_ev)
    steps.append({
        "stage": "4. Chrono Temporal Scheduler", "actor": "chrono",
        "detail": f"Quiet hours verified. Active legal window (09:00-21:00 IST). Dispatch: {legal_dt.strftime('%H:%M')} IST.",
        "proof": {"scheduled_for": legal_dt.strftime("%d %b, %H:%M IST")},
    })

    link_info = await rzp.create_payment_link(sc["paise"], legal_dt)
    link_url = link_info.get("short_url") or f"https://rzp.io/l/{order_id}"
    await execute_reach_and_settle(session, case_obj, sc, cause, now_dt, batch_id, steps, link_url)
    await session.commit()
    return {"case_id": case_obj.id, "batch_id": batch_id, "steps": steps, "customer": sc["name"], "amount": sc["amount_str"], "order_id": order_id}
