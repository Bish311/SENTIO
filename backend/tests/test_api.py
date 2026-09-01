import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.mirror.replay import build_payment_failed_payload


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "clock_ist" in data


@pytest.mark.asyncio
async def test_create_sim_batch_endpoint(client: AsyncClient) -> None:
    response = await client.post("/sim/batch", json={"n": 10, "seed": 42})
    assert response.status_code == 201
    data = response.json()
    assert "batch_id" in data
    assert data["customers_count"] == 10


@pytest.mark.asyncio
async def test_webhook_endpoint_valid_signature(client: AsyncClient) -> None:
    payload_bytes, sig = build_payment_failed_payload(
        subscription_id="sub_webhook_test",
        amount_paise=19900,
        decline_family="insufficient_funds",
    )
    headers = {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": sig,
    }
    response = await client.post("/webhooks/razorpay", content=payload_bytes, headers=headers)
    assert response.status_code == 202

    cases_resp = await client.get("/cases")
    assert cases_resp.status_code == 200
    cases_list = cases_resp.json()
    assert len(cases_list) > 0


@pytest.mark.asyncio
async def test_webhook_endpoint_invalid_signature(client: AsyncClient) -> None:
    payload_bytes, _ = build_payment_failed_payload(
        subscription_id="sub_bad_sig",
        amount_paise=19900,
        decline_family="insufficient_funds",
    )
    headers = {
        "Content-Type": "application/json",
        "X-Razorpay-Signature": "invalid_sig_value",
    }
    response = await client.post("/webhooks/razorpay", content=payload_bytes, headers=headers)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_metrics_and_events_recent_endpoints(client: AsyncClient) -> None:
    ev_resp = await client.get("/events/recent?limit=10")
    assert ev_resp.status_code == 200

    ledger_resp = await client.get("/metrics/ledger")
    assert ledger_resp.status_code == 200

    prev_resp = await client.get("/metrics/prevention")
    assert prev_resp.status_code == 200

    batch_resp = await client.get("/metrics/batch/batch_demo_001")
    assert batch_resp.status_code == 200
    bdata = batch_resp.json()
    assert "arm_a" in bdata
    assert "arm_b" in bdata
    assert "lift" in bdata


@pytest.mark.asyncio
async def test_admin_kill_switch_authorized(client: AsyncClient) -> None:
    headers = {"X-Admin-Token": settings.ADMIN_TOKEN}
    response = await client.post("/admin/kill-switch", json={"enabled": True}, headers=headers)
    assert response.status_code == 200
    assert response.json()["kill_switch_active"] is True

    denials_resp = await client.get("/admin/policy-denials", headers=headers)
    assert denials_resp.status_code == 200

    export_resp = await client.get("/admin/events/export", headers=headers)
    assert export_resp.status_code == 200
    assert len(export_resp.json()) > 0


@pytest.mark.asyncio
async def test_admin_routes_unauthorized(client: AsyncClient) -> None:
    headers = {"X-Admin-Token": "bad_token"}
    response = await client.post("/admin/kill-switch", json={"enabled": True}, headers=headers)
    assert response.status_code == 401
