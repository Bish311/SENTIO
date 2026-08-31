import hashlib
import hmac

from app.core.config import settings
from app.core.errors import SignatureVerificationError


def verify_webhook_signature(payload_bytes: bytes, signature_header: str | None) -> bool:
    if signature_header is None:
        raise SignatureVerificationError("Missing X-Razorpay-Signature header")

    secret = settings.RZP_WEBHOOK_SECRET
    computed_signature = hmac.new(
        secret.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(computed_signature, signature_header):
        raise SignatureVerificationError("Invalid webhook signature")

    return True


def sign_payload(payload_bytes: bytes, secret: str | None = None) -> str:
    signing_secret = secret if secret is not None else settings.RZP_WEBHOOK_SECRET
    return hmac.new(
        signing_secret.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
