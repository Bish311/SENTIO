from app.llm.contracts import (
    T1DiagnosisInput,
    T1DiagnosisOutput,
    T2DraftInput,
    T2DraftOutput,
    T3PtpInput,
    T3PtpOutput,
)
from app.llm.prompts import build_t1_prompt, build_t2_prompt, build_t3_prompt


def test_t1_contracts_and_prompts() -> None:
    t1_in = T1DiagnosisInput(
        decline_code="ERR_RANDOM_01",
        error_description="Card limit hit",
        now_ist="2026-09-01T14:30:00+05:30",
    )
    assert t1_in.decline_code == "ERR_RANDOM_01"

    t1_out = T1DiagnosisOutput(
        cause="budget_burned",
        confidence=0.88,
        reasoning="Card debit velocity ceiling reached",
    )
    assert t1_out.cause == "budget_burned"
    assert t1_out.confidence == 0.88

    sys_p, usr_p = build_t1_prompt("ERR_RANDOM_01", "Card limit hit", "2026-09-01T14:30:00+05:30")
    assert "ERR_RANDOM_01" in usr_p
    assert "budget_burned" in sys_p


def test_t2_contracts_and_prompts() -> None:
    t2_in = T2DraftInput(
        root_cause="cash_timing",
        locale="hi",
        template_skeleton="Hi {name}, payment failed. Pay: {url}",
        amount_display="₹299",
        cta_url="https://rzp.io/i/123",
    )
    assert t2_in.amount_display == "₹299"

    draft_text = "Hi Bish, aapka payment fail hua. Pay: https://rzp.io/i/123. Reply STOP."
    t2_out = T2DraftOutput(body=draft_text)
    assert "https://" in t2_out.body

    sys_p, usr_p = build_t2_prompt("cash_timing", "hi", "₹299", "https://rzp.io/i/123", "Skeleton")
    assert "₹299" in usr_p
    assert "STOP" in sys_p


def test_t3_contracts_and_prompts() -> None:
    t3_in = T3PtpInput(
        reply_text="Salary aane par 5th ko karunga",
        now_ist="2026-09-01T14:30:00+05:30",
        locale="hi",
    )
    assert "Salary" in t3_in.reply_text

    t3_out = T3PtpOutput(
        promised_date="2026-09-05",
        amount_paise=29900,
        confidence=0.92,
        verbatim_quote="5th ko karunga",
    )
    assert t3_out.promised_date == "2026-09-05"
    assert t3_out.confidence == 0.92

    sys_p, usr_p = build_t3_prompt("5th ko karunga", "2026-09-01T14:30:00+05:30", "hi")
    assert "5th ko karunga" in usr_p
    assert "YYYY-MM-DD" in sys_p
