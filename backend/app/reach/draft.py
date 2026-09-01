BANNED_WORDS = [
    "police",
    "legal action",
    "legal notice",
    "arrest",
    "court",
    "defaulter",
    "penalty",
    "jail",
    "cibil",
    "lawyer",
    "advocate",
]


def lint_message_content(content: str) -> tuple[bool, str | None]:
    lower_content = content.lower()

    for word in BANNED_WORDS:
        if word in lower_content:
            return False, f"BANNED_WORD_DETECTED: {word}"

    if "stop" not in lower_content:
        return False, "MISSING_OPTOUT_INSTRUCTION"

    return True, None


def generate_fallback_draft(
    customer_name: str,
    amount_paise: int,
    link_url: str | None = None,
) -> str:
    amount_rupees = amount_paise // 100
    if link_url is not None:
        return (
            f"Hi {customer_name}, charge of ₹{amount_rupees} failed. "
            f"Pay here: {link_url}. "
            f"Reply STOP to opt out."
        )
    return f"Hi {customer_name}, charge of ₹{amount_rupees} failed. Reply STOP to opt out."
