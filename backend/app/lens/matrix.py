MATRIX_DECLINE_MAP: dict[str, str] = {
    "insufficient_funds": "cash_timing",
    "nsf": "cash_timing",
    "low_balance": "cash_timing",
    "gi_01": "cash_timing",
    "gi_02": "cash_timing",
    "not_sufficient_funds": "cash_timing",
    "authentication_failed": "friction",
    "auth_failed": "friction",
    "otp_timeout": "friction",
    "3ds_abandoned": "friction",
    "user_dropped": "friction",
    "card_expired": "dead_instrument",
    "expired_card": "dead_instrument",
    "invalid_instrument": "dead_instrument",
    "card_inactive": "dead_instrument",
    "processing_error": "transient",
    "gateway_error": "transient",
    "issuer_unavailable": "transient",
    "network_error": "transient",
    "timeout": "transient",
    "max_retries_exceeded": "budget_burned",
    "mandate_limit_exceeded": "budget_burned",
    "retry_limit_hit": "budget_burned",
}


def lookup_decline_matrix(
    decline_code: str,
    error_desc: str | None = None,
) -> tuple[str, float] | None:
    code_key = decline_code.lower().strip()
    if code_key in MATRIX_DECLINE_MAP:
        return MATRIX_DECLINE_MAP[code_key], 1.0

    if error_desc:
        desc_key = error_desc.lower().strip()
        for pattern, cause in MATRIX_DECLINE_MAP.items():
            if pattern in desc_key:
                return cause, 1.0

    return None
