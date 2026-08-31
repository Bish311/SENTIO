import json
import time
from typing import Any

import ulid

from app.spine.verify import sign_payload


def build_payment_failed_payload(
    subscription_id: str,
    amount_paise: int,
    decline_family: str,
    customer_email: str = "bish1@example.com",
    customer_phone: str = "+919000000001",
    batch_id: str = "",
) -> tuple[bytes, str]:
    payment_id = f"pay_{str(ulid.ULID()).lower()}"
    error_reason = decline_family
    error_desc = f"Payment failed due to {decline_family}"

    payload_dict: dict[str, Any] = {
        "entity": "event",
        "account_id": "acc_sentio_test",
        "event": "payment.failed",
        "contains": ["payment"],
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "amount": amount_paise,
                    "currency": "INR",
                    "status": "failed",
                    "method": "card",
                    "email": customer_email,
                    "contact": customer_phone,
                    "notes": {
                        "subscription_id": subscription_id,
                        "batch_id": batch_id,
                    },
                    "error_code": "PAYMENT_FAILED",
                    "error_description": error_desc,
                    "error_source": "bank",
                    "error_step": "payment_authorization",
                    "error_reason": error_reason,
                }
            }
        },
        "created_at": int(time.time()),
    }

    payload_bytes = json.dumps(payload_dict, separators=(",", ":")).encode("utf-8")
    signature = sign_payload(payload_bytes)
    return payload_bytes, signature


def build_payment_link_paid_payload(
    link_id: str,
    payment_id: str,
    amount_paise: int,
) -> tuple[bytes, str]:
    payload_dict: dict[str, Any] = {
        "entity": "event",
        "account_id": "acc_sentio_test",
        "event": "payment_link.paid",
        "contains": ["payment_link", "payment"],
        "payload": {
            "payment_link": {
                "entity": {
                    "id": link_id,
                    "amount": amount_paise,
                    "currency": "INR",
                    "status": "paid",
                }
            },
            "payment": {
                "entity": {
                    "id": payment_id,
                    "amount": amount_paise,
                    "status": "captured",
                }
            },
        },
        "created_at": int(time.time()),
    }

    payload_bytes = json.dumps(payload_dict, separators=(",", ":")).encode("utf-8")
    signature = sign_payload(payload_bytes)
    return payload_bytes, signature
