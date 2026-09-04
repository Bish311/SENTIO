import ulid
from sqlalchemy.ext.asyncio import AsyncSession
from app.chrono.timing import calculate_next_legal_window
from app.core.clock import now_utc
from app.core.config import settings
from app.guard.engine import evaluate_proposal
from app.lens.diagnose import diagnose_payment_failure
from app.llm.client import call_openrouter
from app.llm.prompts import build_t2_prompt
from app.models import Case, Customer, Subscription
from app.reach.draft import lint_message_content
from app.reach.rzp import RazorpayClient
from app.spine.ingest import append_event
from app.spine.projector import project_event

async def ensure_live_subscription(
    session: AsyncSession, sub_id: str, cust_id: str, amt: int, email: str, phone: str
) -> None:
    if not await session.get(Customer, cust_id):
        session.add(Customer(
            id=cust_id, name="Live Razorpay Customer", email=email or "customer@sentio.live",
            phone=phone or "+919876543210", locale="hi_IN"
        ))
    if not await session.get(Subscription, sub_id):
        session.add(Subscription(
            id=sub_id, customer_id=cust_id, plan_id="plan_live", amount_paise=amt or 149900,
            status="active", arm="agent", batch_id="live_webhooks"
        ))
    await session.flush()

async def advance_live_case_pipeline(session: AsyncSession, case_id: str, decline: str) -> None:
    case_row = await session.get(Case, case_id)
    if not case_row:
        return
    cause, conf, src, _ = await diagnose_payment_failure(session, case_id=case_id, decline_code=decline)
    ev = await append_event(session, "lens", "case.diagnosed",
        {"case_id": case_id, "root_cause": cause, "confidence": conf, "source": src}, case_id=case_id)
    if ev:
        await project_event(session, ev)

    intv_id = f"intv_{str(ulid.ULID()).lower()}"
    p_ev = await append_event(session, "agent", "intervention.proposed",
        {"intervention_id": intv_id, "case_id": case_id, "action_type": "whatsapp", "seq": 1}, case_id=case_id)
    if p_ev:
        await project_event(session, p_ev)

    rec = await evaluate_proposal(
        session, case_id=case_id, intervention_id=intv_id, action_type="whatsapp",
        proposed_paise=case_row.amount_at_risk_paise, debt_paise=case_row.amount_at_risk_paise,
        proposed_time_utc=now_utc(), customer_opted_out=False, confidence=conf,
    )
    verdict_str = rec.verdict if isinstance(rec.verdict, str) else getattr(rec.verdict, "value", str(rec.verdict))
    v_ev = await append_event(session, "policy", f"policy.{verdict_str}",
        {"case_id": case_id, "intervention_id": intv_id, "receipt": rec.model_dump(mode="json")}, case_id=case_id)
    if v_ev:
        await project_event(session, v_ev)

    win = calculate_next_legal_window(now_utc())
    await append_event(session, "chrono", "chrono.window_opened",
        {"case_id": case_id, "scheduled_window": win.isoformat()}, case_id=case_id)

    rzp = RazorpayClient()
    link_info = await rzp.create_payment_link(case_row.amount_at_risk_paise, win)
    amt_str = f"₹{case_row.amount_at_risk_paise // 100}"
    url_str = link_info.get("short_url") or f"https://rzp.io/l/{case_id}"
    t2_s, t2_u = build_t2_prompt(cause, "hi_IN", amt_str, url_str, f"Hi Customer, please pay {amt_str}.")
    t2_out = await call_openrouter(session, "T2", t2_s, t2_u, settings.LLM_T2_MODEL, settings.LLM_FALLBACK_MODEL, case_id)
    fallback = f"Hi Customer, please pay {amt_str}: {url_str}. Reply STOP to opt out."
    msg = t2_out.get("body") if t2_out and isinstance(t2_out, dict) else fallback
    l_ok, _ = lint_message_content(msg)

    await append_event(session, "reach", "reach.drafted",
        {"case_id": case_id, "intervention_id": intv_id, "content": msg, "model": settings.LLM_T2_MODEL, "linter_passed": l_ok}, case_id=case_id)
    l_ev = await append_event(session, "reach", "link.created",
        {"link_id": link_info.get("id"), "intervention_id": intv_id, "amount_paise": case_row.amount_at_risk_paise, "expire_by": win.isoformat()}, case_id=case_id)
    if l_ev:
        await project_event(session, l_ev)
    await session.commit()
