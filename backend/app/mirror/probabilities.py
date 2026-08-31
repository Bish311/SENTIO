BASE_PROBABILITIES: dict[str, dict[str, float]] = {
    "cash_timing": {
        "baseline": 0.15,
        "agent_matched": 0.70,
        "agent_mismatched": 0.30,
    },
    "friction": {
        "baseline": 0.25,
        "agent_matched": 0.55,
        "agent_mismatched": 0.30,
    },
    "dead_instrument": {
        "baseline": 0.00,
        "agent_matched": 0.60,
        "agent_mismatched": 0.30,
    },
    "transient": {
        "baseline": 0.40,
        "agent_matched": 0.65,
        "agent_mismatched": 0.45,
    },
    "budget_burned": {
        "baseline": 0.00,
        "agent_matched": 0.45,
        "agent_mismatched": 0.25,
    },
    "other": {
        "baseline": 0.10,
        "agent_matched": 0.30,
        "agent_mismatched": 0.20,
    },
}

FAILURE_MIX: dict[str, float] = {
    "insufficient_funds": 0.45,
    "auth_failed": 0.20,
    "card_expired": 0.15,
    "processing_error": 0.10,
    "max_retries_exceeded": 0.05,
    "opaque": 0.05,
}

PRICE_POINTS_PAISE: list[int] = [19900, 29900, 49900, 99900]
