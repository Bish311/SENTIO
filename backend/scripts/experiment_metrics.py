from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Case, Event


async def calculate_experiment_metrics(session: AsyncSession, batch_id: str) -> dict[str, Any]:
    cases_query = select(Case).where(Case.batch_id == batch_id)
    cases_res = await session.execute(cases_query)
    cases = cases_res.scalars().all()

    denials_query = select(Event).where(
        Event.event_type == "policy.denied",
        Event.batch_id == batch_id,
    )
    denials_res = await session.execute(denials_query)
    guardrail_blocks = len(denials_res.scalars().all())

    proposals_query = select(Event).where(
        Event.event_type == "intervention.proposed",
        Event.batch_id == batch_id,
    )
    props_res = await session.execute(proposals_query)
    total_contacts = len(props_res.scalars().all())

    arm_a: list[Case] = []
    arm_b: list[Case] = []
    prevention: list[Case] = []
    for c in cases:
        if c.kind == "prevention":
            prevention.append(c)
        elif c.arm == "agent":
            arm_a.append(c)
        else:
            arm_b.append(c)

    a_rec: list[Case] = []
    a_rec_paise = 0
    a_durations: list[int] = []
    for c in arm_a:
        if c.outcome == "recovered":
            a_rec.append(c)
            a_rec_paise += c.recovered_paise
            if c.closed_at and c.opened_at:
                a_durations.append(int((c.closed_at - c.opened_at).total_seconds()))

    b_rec: list[Case] = []
    b_rec_paise = 0
    b_durations: list[int] = []
    for c in arm_b:
        if c.outcome == "recovered":
            b_rec.append(c)
            b_rec_paise += c.recovered_paise
            if c.closed_at and c.opened_at:
                b_durations.append(int((c.closed_at - c.opened_at).total_seconds()))

    a_durations.sort()
    b_durations.sort()
    med_a = a_durations[len(a_durations) // 2] if a_durations else 0
    med_b = b_durations[len(b_durations) // 2] if b_durations else 0

    a_rate = round(len(a_rec) / len(arm_a), 4) if len(arm_a) > 0 else 0.0
    b_rate = round(len(b_rec) / len(arm_b), 4) if len(arm_b) > 0 else 0.0
    lift = round(a_rec_paise / b_rec_paise, 2) if b_rec_paise > 0 else 1.0

    avoided_paise = 0
    for c in prevention:
        if c.state in ("settled", "closed") or c.outcome == "prevented":
            avoided_paise += c.amount_at_risk_paise

    cpr_a = round(total_contacts / max(len(a_rec), 1), 2)

    return {
        "batch_id": batch_id,
        "arm_a": {
            "total_cases": len(arm_a),
            "recovered_cases": len(a_rec),
            "recovered_paise": a_rec_paise,
            "recovery_rate": a_rate,
            "median_ttr_s": med_a,
            "contacts_per_recovery": cpr_a,
        },
        "arm_b": {
            "total_cases": len(arm_b),
            "recovered_cases": len(b_rec),
            "recovered_paise": b_rec_paise,
            "recovery_rate": b_rate,
            "median_ttr_s": med_b,
        },
        "lift": lift,
        "guardrail_blocks": guardrail_blocks,
        "prevented_cases": len(prevention),
        "avoided_paise": avoided_paise,
    }
