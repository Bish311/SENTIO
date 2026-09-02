from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import now_utc
from app.core.config import settings
from app.lens.matrix import lookup_decline_matrix
from app.llm.client import call_openrouter
from app.llm.prompts import build_t1_prompt
from app.spine.ingest import append_event
from app.spine.projector import project_event


async def diagnose_payment_failure(
    session: AsyncSession,
    case_id: str,
    decline_code: str,
    error_desc: str | None = None,
) -> tuple[str, float, str, bool]:
    matrix_hit = lookup_decline_matrix(decline_code, error_desc)
    if matrix_hit is not None:
        cause, conf = matrix_hit
        await _record_diagnosis(session, case_id, cause, conf, "matrix", False, decline_code)
        return cause, conf, "matrix", False

    now_ist_str = now_utc().astimezone(settings.timezone).isoformat()
    sys_prompt, usr_prompt = build_t1_prompt(decline_code, error_desc, now_ist_str)

    parsed = await call_openrouter(
        session=session,
        touchpoint="T1",
        system_prompt=sys_prompt,
        user_prompt=usr_prompt,
        primary_model=settings.LLM_T1_MODEL,
        fallback_model=settings.LLM_FALLBACK_MODEL,
        case_id=case_id,
    )

    cause = "other"
    conf = 0.5
    handoff = True
    if parsed and isinstance(parsed, dict):
        raw_cause = str(parsed.get("cause", "other"))
        raw_conf = float(parsed.get("confidence", 0.5))
        if raw_conf >= 0.7 and raw_cause in [
            "cash_timing",
            "friction",
            "dead_instrument",
            "transient",
            "budget_burned",
        ]:
            cause = raw_cause
            conf = raw_conf
            handoff = False
        else:
            cause = raw_cause
            conf = raw_conf
            handoff = True

    await _record_diagnosis(session, case_id, cause, conf, "llm", handoff, decline_code)
    return cause, conf, "llm", handoff


async def _record_diagnosis(
    session: AsyncSession,
    case_id: str,
    root_cause: str,
    confidence: float,
    source: str,
    handoff: bool,
    decline_code: str,
) -> None:
    event_row = await append_event(
        session=session,
        actor="agent",
        event_type="diagnosis.made",
        case_id=case_id,
        payload={
            "case_id": case_id,
            "root_cause": root_cause,
            "confidence": confidence,
            "source": source,
            "handoff_flag": handoff,
            "decline_code": decline_code,
        },
    )
    if event_row is not None:
        await project_event(session, event_row)
