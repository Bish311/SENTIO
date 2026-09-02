from datetime import datetime
from typing import Any

import ulid
from pydantic import BaseModel, Field

from app.core.clock import now_utc


class PolicyReceipt(BaseModel):
    receipt_id: str = Field(default_factory=lambda: f"rcpt_{str(ulid.ULID()).lower()}")
    case_id: str
    intervention_id: str
    verdict: str
    evaluated_at: datetime = Field(default_factory=now_utc)
    rules_evaluated: list[str]
    violations: list[str]
    context: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "receipt_id": self.receipt_id,
            "case_id": self.case_id,
            "intervention_id": self.intervention_id,
            "verdict": self.verdict,
            "evaluated_at": self.evaluated_at.isoformat(),
            "rules_evaluated": self.rules_evaluated,
            "violations": self.violations,
            "context": self.context,
        }


def build_receipt(
    case_id: str,
    intervention_id: str,
    verdict: str,
    rules_evaluated: list[str],
    violations: list[str],
    context: dict[str, Any],
) -> PolicyReceipt:
    return PolicyReceipt(
        case_id=case_id,
        intervention_id=intervention_id,
        verdict=verdict,
        rules_evaluated=rules_evaluated,
        violations=violations,
        context=context,
    )
