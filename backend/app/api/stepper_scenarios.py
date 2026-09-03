from typing import Any

SCENARIOS: list[dict[str, Any]] = [
    {
        "name": "Priya Patel",
        "email": "priya@corp.in",
        "paise": 149900,
        "amount_str": "₹1,499",
        "code": "ERR_ISSUER_SETTLEMENT_0x82",
        "desc": "Sub-node authorization handshake refused at leg 2",
        "reply": "Priya here, kal subah 10 baje tak transfer kar dungi pakka",
    },
    {
        "name": "Amit Verma",
        "email": "amit.v@startup.in",
        "paise": 49900,
        "amount_str": "₹499",
        "code": "NODE_ROUTE_LATENCY_TIMEOUT",
        "desc": "Inter-bank switch latency exceeded threshold (5000ms)",
        "reply": "Bhai abhi cash crunch hai, salary 5th ko aayegi tab karta hu",
    },
    {
        "name": "Sneha Reddy",
        "email": "sneha.r@design.co",
        "paise": 299900,
        "amount_str": "₹2,999",
        "code": "AUTH_INTERMEDIARY_DROP_0x33",
        "desc": "Payment gateway dropped handshake packet on network switch",
        "reply": "Weekend pe 7th ko reminder bhejna, tab account me balance hoga",
    },
    {
        "name": "Vikram Singh",
        "email": "vikram@tech.in",
        "paise": 79900,
        "amount_str": "₹799",
        "code": "insufficient_funds",
        "desc": "Insufficient funds in customer account",
        "reply": "Agle hafte 10th ko salary aayegi tab pay kar dunga pakka",
    },
]


def get_stepper_scenario(idx: int, opaque: bool = True) -> dict[str, Any]:
    sc = dict(SCENARIOS[idx % len(SCENARIOS)])
    if not opaque:
        sc["code"] = "insufficient_funds"
        sc["desc"] = "Insufficient funds"
    return sc
