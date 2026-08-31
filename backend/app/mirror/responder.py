import random
from typing import Any

from app.mirror.probabilities import BASE_PROBABILITIES
from app.mirror.replies import (
    PAY_NOW_REPLIES,
    PROMISE_REPLIES,
    STOP_REPLIES,
    VAGUE_REPLIES,
)


def sample_customer_outcome(
    root_cause: str,
    arm: str,
    persona: dict[str, Any],
    channel_matched: bool,
    seq: int,
    rng: random.Random,
) -> str:
    if persona.get("never_recovers", False):
        return "ignored"

    cause_probs = BASE_PROBABILITIES.get(root_cause, BASE_PROBABILITIES["other"])

    if arm == "baseline":
        prob = cause_probs["baseline"]
    else:
        prob = cause_probs["agent_matched"] if channel_matched else cause_probs["agent_mismatched"]

    decay = 0.8 ** (seq - 1)
    effective_prob = min(1.0, max(0.0, prob * decay))

    roll = rng.random()
    if roll < effective_prob:
        return "paid"

    remainder = rng.random()
    if remainder < 0.25:
        return "promised"
    if remainder < 0.35:
        return "vague"
    if remainder < 0.40:
        return "opted_out"
    return "ignored"


def get_simulated_reply_text(outcome: str, rng: random.Random) -> str | None:
    if outcome == "promised":
        return rng.choice(PROMISE_REPLIES)
    if outcome == "vague":
        return rng.choice(VAGUE_REPLIES)
    if outcome == "opted_out":
        return rng.choice(STOP_REPLIES)
    if outcome == "paid":
        return rng.choice(PAY_NOW_REPLIES)
    return None
