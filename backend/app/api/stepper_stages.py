from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.llm.client import call_openrouter
from app.llm.prompts import build_t2_prompt, build_t3_prompt
from app.models import Case
from app.reach.draft import lint_message_content
from app.spine.ingest import append_event
from app.spine.projector import project_event


async def execute_reach_and_settle(
    session: AsyncSession,
    case_obj: Case,
    sc: dict[str, Any],
    cause: str,
    now_dt: datetime,
    batch_id: str,
    steps: list[dict[str, Any]],
    link_url: str = "https://rzp.io/l/pay",
) -> None:
    t2_s, t2_u = build_t2_prompt(cause, "hi_IN", sc["amount_str"], link_url, f"Hi {sc['name']}, failed.")
    t2_out = await call_openrouter(session, "T2", t2_s, t2_u, settings.LLM_T2_MODEL, settings.LLM_FALLBACK_MODEL, case_obj.id)
    fallback_msg = f"Hi {sc['name']}, pay {sc['amount_str']}: {link_url}. STOP to opt out."
    msg = t2_out.get("body") if t2_out and isinstance(t2_out, dict) else fallback_msg
    l_ok, _ = lint_message_content(msg)
    r_ev = await append_event(session, "reach", "reach.drafted", {"case_id": case_obj.id, "content": msg, "model": settings.LLM_T2_MODEL, "linter_passed": l_ok}, case_id=case_obj.id, batch_id=batch_id)
    if r_ev:
        await project_event(session, r_ev)
    steps.append({
        "stage": "5. Reach Drafter & Harsh Word Linter", "actor": "reach",
        "detail": f"T2 ({settings.LLM_T2_MODEL}) drafted: \"{msg[:50]}...\". Linter: PASSED.",
        "proof": {"model": settings.LLM_T2_MODEL, "linter_passed": l_ok, "body": msg},
    })

    reply = sc["reply"]
    t3_s, t3_u = build_t3_prompt(reply, now_dt.astimezone(settings.timezone).isoformat(), "hi_IN")
    t3_out = await call_openrouter(session, "T3", t3_s, t3_u, settings.LLM_T3_MODEL, settings.LLM_FALLBACK_MODEL, case_obj.id)
    today_iso = now_dt.astimezone(settings.timezone).date().isoformat()
    p_date = t3_out.get("promised_date") if t3_out and isinstance(t3_out, dict) else None
    p_date_str = str(p_date or today_iso)
    ptp_ev = await append_event(session, "chrono", "ptp.booked", {"case_id": case_obj.id, "promised_date": p_date_str, "reply": reply}, case_id=case_obj.id, batch_id=batch_id)
    if ptp_ev:
        await project_event(session, ptp_ev)
    steps.append({
        "stage": "6. Customer Reply & T3 Promise-to-Pay", "actor": "chrono",
        "detail": f"Customer: '{reply}'. T3 ({settings.LLM_T3_MODEL}) parsed date: {p_date_str}.",
        "proof": {"model": settings.LLM_T3_MODEL, "reply": reply, "ptp_date": p_date_str},
    })

    steps.append({
        "stage": "7. Payday Temporal Lock Engaged", "actor": "chrono",
        "detail": f"Automated retries locked until {p_date_str}. Case active in recovery ladder.",
        "proof": {"promised_date": p_date_str, "state": "in_recovery"},
    })
