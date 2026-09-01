def build_t1_prompt(
    decline_code: str,
    error_description: str | None,
    now_ist: str,
) -> tuple[str, str]:
    system_prompt = (
        "You are an expert payment recovery diagnostic agent for Indian subscription billing. "
        "Diagnose the root cause of payment failure. "
        "You must respond ONLY with a valid JSON object matching this schema: "
        '{"cause": "cash_timing"|"friction"|"dead_instrument"|"transient"|"budget_burned"|"other", '
        '"confidence": float_between_0_and_1, "reasoning": "one sentence max"}'
    )
    user_prompt = (
        f"Decline Code: {decline_code}\n"
        f"Description: {error_description or 'None'}\n"
        f"Current IST Time: {now_ist}\n"
        "Return the JSON diagnosis."
    )
    return system_prompt, user_prompt


def build_t2_prompt(
    root_cause: str,
    locale: str,
    amount_display: str,
    cta_url: str,
    skeleton: str,
) -> tuple[str, str]:
    system_prompt = (
        "You are a friendly recovery messaging agent for subscription billing in India. "
        "Draft a single concise customer notification message. "
        "Rules: include exact amount, exact URL, and opt-out keyword STOP. "
        "No guilt-tripping, no legal threats, no discounts. "
        "Respond ONLY with a JSON object: {\"body\": \"<message_text>\"}"
    )
    user_prompt = (
        f"Root Cause: {root_cause}\n"
        f"Locale: {locale}\n"
        f"Amount: {amount_display}\n"
        f"Payment Link: {cta_url}\n"
        f"Template Skeleton: {skeleton}\n"
        "Generate the customer message."
    )
    return system_prompt, user_prompt


def build_t3_prompt(reply_text: str, now_ist: str, locale: str) -> tuple[str, str]:
    system_prompt = (
        "You are a promise-to-pay extraction agent. "
        "Analyze customer reply to extract promised payment date and amount "
        "relative to current IST date. "
        "Rules: date format must be YYYY-MM-DD. "
        "If date is vague, set promised_date to null and confidence < 0.7. "
        "Respond ONLY with a JSON object: "
        '{"promised_date": "YYYY-MM-DD"|null, '
        '"amount_paise": int|null, '
        '"confidence": float, '
        '"verbatim_quote": "exact quote"}'
    )
    user_prompt = (
        f"Current IST Date/Time: {now_ist}\n"
        f"Customer Locale: {locale}\n"
        f"Customer Reply: {reply_text}\n"
        "Extract the promise details."
    )
    return system_prompt, user_prompt
