from typing import Awaitable, Callable

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Event
from app.spine.project_case import (
    project_case_closed,
    project_case_diagnosed,
    project_case_opened,
    project_case_prevented,
)
from app.spine.project_intv import (
    project_intervention_proposed,
    project_link_created,
    project_link_paid,
    project_policy_verdict,
)
from app.spine.project_misc import (
    project_optout,
    project_ptp_booked,
    project_ptp_status,
    project_retry_executed,
)


async def _wrap_closed(session: AsyncSession, event: Event) -> None:
    await project_case_closed(session, event.payload, event.ts)

async def _wrap_policy_allowed(session: AsyncSession, event: Event) -> None:
    await project_policy_verdict(session, event.payload, "allowed")

async def _wrap_policy_denied(session: AsyncSession, event: Event) -> None:
    await project_policy_verdict(session, event.payload, "denied")

async def _wrap_ptp_booked(session: AsyncSession, event: Event) -> None:
    await project_ptp_booked(session, event.payload, event.id)

async def _wrap_ptp_kept(session: AsyncSession, event: Event) -> None:
    await project_ptp_status(session, event.payload, "kept")

async def _wrap_ptp_broken(session: AsyncSession, event: Event) -> None:
    await project_ptp_status(session, event.payload, "broken")

def _default_payload(
    handler: Callable[[AsyncSession, dict], Awaitable[None]],
) -> Callable[[AsyncSession, Event], Awaitable[None]]:
    async def _wrapped(session: AsyncSession, event: Event) -> None:
        await handler(session, event.payload)

    return _wrapped

_HANDLERS: dict[str, Callable[[AsyncSession, Event], Awaitable[None]]] = {
    "case.opened": project_case_opened,
    "case.diagnosed": _default_payload(project_case_diagnosed),
    "case.closed": _wrap_closed,
    "case.prevented": _default_payload(project_case_prevented),
    "intervention.proposed": _default_payload(project_intervention_proposed),
    "policy.allowed": _wrap_policy_allowed,
    "policy.denied": _wrap_policy_denied,
    "link.created": _default_payload(project_link_created),
    "payment_link.paid": _default_payload(project_link_paid),
    "ptp.booked": _wrap_ptp_booked,
    "ptp.kept": _wrap_ptp_kept,
    "ptp.broken": _wrap_ptp_broken,
    "optout.requested": _default_payload(project_optout),
    "retry.executed": _default_payload(project_retry_executed),
}

async def project_event(session: AsyncSession, event: Event) -> None:
    handler = _HANDLERS.get(event.event_type)
    if handler:
        await handler(session, event)
