import json
import time
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.spine.ingest import append_event


async def call_openrouter(
    session: AsyncSession | None,
    touchpoint: str,
    system_prompt: str,
    user_prompt: str,
    primary_model: str,
    fallback_model: str,
    case_id: str | None = None,
) -> dict[str, Any] | None:
    models_to_try = [primary_model, fallback_model]
    for model in models_to_try:
        start_t = time.perf_counter()
        parsed, raw_resp, ok = await _execute_http_attempt(
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
        )
        latency_ms = int((time.perf_counter() - start_t) * 1000)

        if session is not None:
            await append_event(
                session=session,
                actor="agent",
                event_type="llm.called",
                case_id=case_id,
                payload={
                    "touchpoint": touchpoint,
                    "model": model,
                    "prompt": user_prompt,
                    "response": raw_resp,
                    "parsed_output": parsed,
                    "latency_ms": latency_ms,
                    "usage": {"in": 0, "out": 0},
                    "ok": ok,
                },
            )

        if ok and parsed is not None:
            return parsed

    return None


async def _execute_http_attempt(
    model: str,
    system_prompt: str,
    user_prompt: str,
) -> tuple[dict[str, Any] | None, str, bool]:
    url = f"{settings.OPENROUTER_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                return None, resp.text, False
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            return parsed, content, True
    except Exception as exc:
        return None, str(exc), False
