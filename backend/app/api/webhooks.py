import json

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.cases.engine import handle_payment_failed
from app.core.db import get_db
from app.core.errors import SignatureVerificationError
from app.core.logging import logger
from app.spine.ingest import append_event, quarantine_event
from app.spine.projector import project_event
from app.spine.verify import verify_webhook_signature

router = APIRouter()


@router.post("/webhooks/razorpay", status_code=status.HTTP_202_ACCEPTED)
async def receive_razorpay_webhook(
    request: Request,
    x_razorpay_signature: str | None = Header(default=None),
    session: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    body_bytes = await request.body()

    try:
        verify_webhook_signature(body_bytes, x_razorpay_signature)
    except SignatureVerificationError as err:
        logger.warning(f"Webhook signature verification failed: {err}")
        await quarantine_event(
            session=session,
            reason="invalid_signature",
            raw_sha=str(hash(body_bytes)),
            payload={"raw_length": len(body_bytes)},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature",
        ) from err

    try:
        body_json = json.loads(body_bytes.decode("utf-8"))
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Malformed JSON body",
        ) from err

    event_type = body_json.get("event", "unknown")
    payload = body_json.get("payload", {})
    payment_entity = payload.get("payment", {}).get("entity", {})
    notes = payment_entity.get("notes", {})

    sub_id = notes.get("subscription_id", "")
    batch_id = notes.get("batch_id", "")
    dedup_key = payment_entity.get("id") or body_json.get("id")

    event_row = await append_event(
        session=session,
        actor="system",
        event_type=event_type,
        payload=body_json,
        batch_id=batch_id if batch_id else None,
        dedup_key=dedup_key,
    )

    if event_row is None:
        return {"status": "ignored_duplicate"}

    if event_type == "payment.failed" and sub_id:
        amount_paise = payment_entity.get("amount", 0)
        decline_code = payment_entity.get("error_reason")
        await handle_payment_failed(
            session=session,
            subscription_id=sub_id,
            amount_paise=amount_paise,
            decline_code=decline_code,
            error_details=payment_entity,
            batch_id=batch_id,
        )

    await project_event(session, event_row)
    return {"status": "accepted"}
