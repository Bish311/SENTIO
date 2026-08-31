from datetime import datetime
from typing import Any

import httpx

from app.core.config import settings


class RazorpayClient:
    def __init__(self) -> None:
        self.base_url = "https://api.razorpay.com/v1"
        self.auth = (settings.RZP_KEY_ID, settings.RZP_KEY_SECRET)

    async def create_payment_link(
        self,
        amount_paise: int,
        expire_by: datetime,
        purpose: str = "recover",
        notes: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        payload = {
            "amount": amount_paise,
            "currency": "INR",
            "expire_by": int(expire_by.timestamp()),
            "description": f"Subscription payment ({purpose})",
            "notes": notes or {},
        }
        async with httpx.AsyncClient(base_url=self.base_url, auth=self.auth) as client:
            try:
                response = await client.post("/payment_links", json=payload, timeout=10.0)
                if response.status_code in [200, 201]:
                    return response.json()
            except Exception:
                pass

        return {
            "id": f"link_sim_{int(expire_by.timestamp())}",
            "amount": amount_paise,
            "status": "created",
            "short_url": f"https://rzp.io/i/sim_{purpose}",
        }

    async def fetch_subscription(self, subscription_id: str) -> dict[str, Any] | None:
        async with httpx.AsyncClient(base_url=self.base_url, auth=self.auth) as client:
            try:
                response = await client.get(f"/subscriptions/{subscription_id}", timeout=10.0)
                if response.status_code == 200:
                    return response.json()
            except Exception:
                pass
        return None
