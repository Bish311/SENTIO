import random
from typing import Any

FIRST_NAMES = ["Rohan", "Ananya", "Rajesh", "Kavita", "Siddharth", "Meera", "Arjun", "Pooja", "Aditya", "Neha"]
LAST_NAMES = ["Sharma", "Nair", "Iyer", "Gupta", "Deshmukh", "Kulkarni", "Mukherjee", "Rao", "Mehta", "Patel"]
AMOUNTS = [39900, 49900, 79900, 99900, 129900, 149900, 199900, 249900]
DECLINES = [
    ("NODE_ROUTE_LATENCY_TIMEOUT", "Inter-bank switch latency exceeded threshold (5000ms)"),
    ("ERR_ISSUER_SETTLEMENT_0x82", "Sub-node authorization handshake refused at leg 2"),
    ("AUTH_INTERMEDIARY_DROP_0x33", "Payment gateway dropped handshake packet on network switch"),
    ("BANK_DOWNTIME_TRANSIENT", "Core banking server temporary timeout during peak processing"),
    ("insufficient_funds", "Customer account balance below required mandate threshold"),
]
REPLIES = [
    "Salary 5th ko aayegi tab pay karta hu pakka",
    "Abhi travelling me hu, kal subah 10 baje tak transfer kar dunga",
    "Weekend pe 7th ko reminder bhejna, tab account me balance hoga",
    "Agle hafte 10th ko salary credit hogi tabhi possible hoga",
    "Main parso dopahar tak definitely settle kar dunga",
]


def get_stepper_scenario(idx: int, opaque: bool = True) -> dict[str, Any]:
    rng = random.Random()
    f_name = FIRST_NAMES[idx % len(FIRST_NAMES)]
    l_name = LAST_NAMES[(idx + rng.randint(1, 8)) % len(LAST_NAMES)]
    full_name = f"{f_name} {l_name}"
    email = f"{f_name.lower()}.{l_name.lower()}@domain.in"
    paise = AMOUNTS[(idx + rng.randint(0, len(AMOUNTS) - 1)) % len(AMOUNTS)]

    code, desc = DECLINES[idx % len(DECLINES)]
    if not opaque:
        code, desc = "insufficient_funds", "Insufficient funds"

    reply = REPLIES[idx % len(REPLIES)]
    return {
        "name": full_name,
        "email": email,
        "paise": paise,
        "amount_str": f"₹{paise // 100:,}",
        "code": code,
        "desc": desc,
        "reply": reply,
    }
