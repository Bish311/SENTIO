from typing import Literal

from pydantic import BaseModel, Field

RootCauseType = Literal[
    "cash_timing",
    "friction",
    "dead_instrument",
    "transient",
    "budget_burned",
    "other",
]


class T1DiagnosisInput(BaseModel):
    decline_code: str
    error_description: str | None = None
    error_source: str | None = None
    error_step: str | None = None
    retry_history: list[dict[str, str | int]] = Field(default_factory=list)
    now_ist: str


class T1DiagnosisOutput(BaseModel):
    cause: RootCauseType
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str


class T2DraftInput(BaseModel):
    root_cause: str
    locale: str = "en"
    persona_tone_hint: str = "polite"
    template_skeleton: str
    amount_display: str
    due_display: str | None = None
    cta_url: str


class T2DraftOutput(BaseModel):
    body: str


class T3PtpInput(BaseModel):
    reply_text: str
    now_ist: str
    locale: str = "en"


class T3PtpOutput(BaseModel):
    promised_date: str | None = None
    amount_paise: int | None = None
    confidence: float = Field(ge=0.0, le=1.0)
    verbatim_quote: str = ""
