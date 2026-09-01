from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import now_utc
from app.guard.receipt import PolicyReceipt
from app.models import Case, Customer
from app.reach.channels import send_customer_message
from app.reach.draft import generate_fallback_draft
from app.reach.links import create_case_payment_link


async def execute_allowed_proposal(
    session: AsyncSession,
    case_row: Case,
    customer_row: Customer,
    intervention_id: str,
    action_type: str,
    channel: str = "whatsapp",
    custom_content: str | None = None,
    receipt: PolicyReceipt | None = None,
) -> dict[str, str]:
    if receipt is not None and receipt.verdict != "ALLOW":
        raise PermissionError("Cannot execute proposal with DENY policy receipt")

    result: dict[str, str] = {}
    if action_type in ["payment_link", "update_card_link"]:
        expire_at = now_utc() + timedelta(days=2)
        link_id = await create_case_payment_link(
            session=session,
            case_id=case_row.id,
            intervention_id=intervention_id,
            amount_paise=case_row.amount_at_risk_paise,
            expire_by=expire_at,
            purpose=action_type,
        )
        content = custom_content or generate_fallback_draft(
            customer_name=customer_row.name,
            amount_paise=case_row.amount_at_risk_paise,
            link_url=f"https://rzp.io/i/{link_id}",
        )
        msg_id = await send_customer_message(
            session=session,
            case_id=case_row.id,
            intervention_id=intervention_id,
            channel=channel,
            recipient=customer_row.phone,
            content=content,
        )
        result["link_id"] = link_id
        result["message_id"] = msg_id

    elif action_type == "message":
        content = custom_content or generate_fallback_draft(
            customer_name=customer_row.name,
            amount_paise=case_row.amount_at_risk_paise,
        )
        msg_id = await send_customer_message(
            session=session,
            case_id=case_row.id,
            intervention_id=intervention_id,
            channel=channel,
            recipient=customer_row.phone,
            content=content,
        )
        result["message_id"] = msg_id

    return result
