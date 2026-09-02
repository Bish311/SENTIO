from datetime import datetime

import ulid
from sqlalchemy.ext.asyncio import AsyncSession

from app.reach.rzp import RazorpayClient
from app.spine.ingest import append_event
from app.spine.projector import project_event

rzp_client = RazorpayClient()


async def create_case_payment_link(
    session: AsyncSession,
    case_id: str,
    intervention_id: str,
    amount_paise: int,
    expire_by: datetime,
    purpose: str = "recover",
) -> str:
    link_data = await rzp_client.create_payment_link(
        amount_paise=amount_paise,
        expire_by=expire_by,
        purpose=purpose,
        notes={"case_id": case_id, "intervention_id": intervention_id},
    )
    link_id = link_data.get("id", f"link_{str(ulid.ULID()).lower()}")

    event_row = await append_event(
        session=session,
        actor="reach",
        event_type="link.created",
        case_id=case_id,
        payload={
            "link_id": link_id,
            "intervention_id": intervention_id,
            "amount_paise": amount_paise,
            "purpose": purpose,
            "expire_by": expire_by.isoformat(),
            "short_url": link_data.get("short_url", ""),
        },
    )
    if event_row is not None:
        await project_event(session, event_row)

    return link_id
