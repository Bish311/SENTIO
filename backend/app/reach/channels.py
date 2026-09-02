import ulid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import logger
from app.spine.ingest import append_event
from app.spine.projector import project_event


async def send_customer_message(
    session: AsyncSession,
    case_id: str,
    intervention_id: str,
    channel: str,
    recipient: str,
    content: str,
) -> str:
    message_id = f"msg_{str(ulid.ULID()).lower()}"

    if settings.CHANNEL_MODE == "sim":
        logger.info(f"Simulated message sent to {recipient} via {channel}: {message_id}")
    else:
        logger.info(f"Dispatching real message to {recipient} via {channel}: {message_id}")

    event_row = await append_event(
        session=session,
        actor="reach",
        event_type="message.sent",
        case_id=case_id,
        payload={
            "message_id": message_id,
            "intervention_id": intervention_id,
            "channel": channel,
            "recipient": recipient,
            "content": content,
        },
    )
    if event_row is not None:
        await project_event(session, event_row)

    return message_id
