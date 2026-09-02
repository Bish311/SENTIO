from datetime import date
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.chrono.ptp_book import record_booked_promise
from app.core.clock import now_utc
from app.core.config import settings
from app.llm.client import call_openrouter
from app.llm.prompts import build_t3_prompt
from app.models import Promise
from app.spine.ingest import append_event


async def extract_and_book_ptp(
    session: AsyncSession,
    case_id: str,
    reply_text: str,
    locale: str = "en",
    source_event_id: int = 0,
) -> dict[str, Any]:
    tz = settings.timezone
    now_ist_dt = now_utc().astimezone(tz)
    now_ist_str = now_ist_dt.isoformat()
    today_ist = now_ist_dt.date()

    sys_prompt, usr_prompt = build_t3_prompt(reply_text, now_ist_str, locale)
    parsed = await call_openrouter(
        session=session,
        touchpoint="T3",
        system_prompt=sys_prompt,
        user_prompt=usr_prompt,
        primary_model=settings.LLM_T3_MODEL,
        fallback_model=settings.LLM_FALLBACK_MODEL,
        case_id=case_id,
    )

    prom_date_str = None
    confidence = 0.0
    amount_paise = None
    quote = reply_text

    if parsed and isinstance(parsed, dict):
        prom_date_str = parsed.get("promised_date")
        confidence = float(parsed.get("confidence", 0.0))
        amount_paise = parsed.get("amount_paise")
        quote = str(parsed.get("verbatim_quote", reply_text))

    valid_ptp = False
    parsed_date = None
    if prom_date_str and confidence >= 0.7:
        try:
            parsed_date = date.fromisoformat(prom_date_str)
            days_diff = (parsed_date - today_ist).days
            if 0 < days_diff <= 30:
                valid_ptp = True
        except Exception:
            valid_ptp = False

    if valid_ptp and parsed_date is not None:
        return await record_booked_promise(
            session=session,
            case_id=case_id,
            parsed_date=parsed_date,
            amount_paise=amount_paise,
            confidence=confidence,
            quote=quote,
            tz=tz,
        )

    await append_event(
        session=session,
        actor="agent",
        event_type="handoff.flagged",
        case_id=case_id,
        payload={"case_id": case_id, "reason": "vague_date_or_low_confidence", "quote": quote},
    )
    return {"status": "handoff", "confidence": confidence}


async def is_case_ptp_active(session: AsyncSession, case_id: str) -> bool:
    tz = settings.timezone
    today_ist = now_utc().astimezone(tz).date()

    query = (
        select(Promise)
        .where(Promise.case_id == case_id)
        .where(Promise.status == "booked")
        .where(Promise.promised_date >= today_ist)
    )
    res = await session.execute(query)
    prom = res.scalar_one_or_none()
    return prom is not None
