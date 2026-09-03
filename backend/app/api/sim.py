from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.models import Case, PaymentLink
from app.spine.ingest import append_event
from app.spine.projector import project_event

router = APIRouter(prefix="/sim", tags=["simulation"])


class BatchCreateRequest(BaseModel):
    n: int = Field(default=200, ge=1, le=1000)
    seed: int = Field(default=42)


class CustomerReplyRequest(BaseModel):
    case_id: str
    body: str


class LinkActionRequest(BaseModel):
    rzp_link_id: str
    action: str = Field(default="paid")


@router.post("/batch", status_code=status.HTTP_201_CREATED)
async def create_simulation_batch(
    request: BatchCreateRequest,
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    from scripts.experiment_runner import run_experiment_batch

    result = await run_experiment_batch(
        session=session,
        seed=request.seed,
        n_customers=request.n,
    )
    return {
        "batch_id": result["batch_id"],
        "customers_count": request.n,
        "subscriptions_count": request.n * 2,
    }


@router.post("/customer-reply", status_code=status.HTTP_202_ACCEPTED)
async def receive_customer_reply(
    request: CustomerReplyRequest,
    session: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    case_res = await session.execute(select(Case).where(Case.id == request.case_id))
    case_row = case_res.scalar_one_or_none()
    if case_row is None:
        raise HTTPException(status_code=404, detail="Case not found")

    event_type = "optout.requested" if request.body.strip().upper() == "STOP" else "reply.received"
    event_row = await append_event(
        session=session,
        actor="customer",
        event_type=event_type,
        case_id=request.case_id,
        batch_id=case_row.batch_id,
        payload={"case_id": request.case_id, "body": request.body},
    )
    if event_row is not None:
        await project_event(session, event_row)

    return {"status": "reply_recorded"}


@router.post("/link-action", status_code=status.HTTP_202_ACCEPTED)
async def handle_link_action(
    request: LinkActionRequest,
    session: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    link_res = await session.execute(
        select(PaymentLink).where(PaymentLink.id == request.rzp_link_id)
    )
    link_row = link_res.scalar_one_or_none()
    if link_row is None:
        raise HTTPException(status_code=404, detail="Payment link not found")

    if request.action == "paid":
        event_row = await append_event(
            session=session,
            actor="system",
            event_type="payment_link.paid",
            payload={
                "rzp_link_id": request.rzp_link_id,
                "amount_paise": link_row.amount_paise,
            },
        )
        if event_row is not None:
            await project_event(session, event_row)

    return {"status": "action_processed"}
