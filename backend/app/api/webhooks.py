import json

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.cases.engine import handle_payment_failed
from app.cases.live_pipeline import advance_live_case_pipeline, ensure_live_subscription
from app.cases.live_settle import handle_live_payment_success
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
            session=session, reason="invalid_signature", raw_sha=str(hash(body_bytes)), payload={}
        )
        raise HTTPException(status_code=401, detail="Invalid signature") from err

    try:
        body_json = json.loads(body_bytes.decode("utf-8"))
    except Exception as err:
        raise HTTPException(status_code=400, detail="Malformed JSON body") from err

    event_type = body_json.get("event", "unknown")
    payload = body_json.get("payload", {})
    payment_entity = payload.get("payment", {}).get("entity", {})
    notes = payment_entity.get("notes", {})
    sub_id = notes.get("subscription_id", "")
    batch_id = notes.get("batch_id", "")
    dedup_key = payment_entity.get("id") or body_json.get("id")

    event_row = await append_event(
        session=session, actor="system", event_type=event_type, payload=body_json,
        batch_id=batch_id if batch_id else None, dedup_key=dedup_key,
    )
    if event_row is None:
        return {"status": "ignored_duplicate"}

    if event_type == "payment.failed":
        pay_id = payment_entity.get("id", "live")
        amt = int(payment_entity.get("amount") or payload.get("order", {}).get("entity", {}).get("amount", 0))
        if not sub_id:
            sub_id, cust_id = f"sub_{pay_id}", f"cust_{pay_id}"
            await ensure_live_subscription(
                session, sub_id, cust_id, amt,
                payment_entity.get("email", ""), payment_entity.get("contact", "")
            )
        decline = payment_entity.get("error_reason") or "ERR_PAYMENT_FAILED"
        case_obj = await handle_payment_failed(
            session=session, subscription_id=sub_id,
            amount_paise=amt,
            decline_code=decline, error_details=payment_entity, batch_id=batch_id,
        )
        if case_obj:
            await advance_live_case_pipeline(session, case_obj.id, decline)
    elif event_type in ["payment_link.paid", "payment.captured"]:
        await handle_live_payment_success(session, payload)

    await project_event(session, event_row)
    return {"status": "accepted"}
