import random
from typing import Any

FIRST_NAMES = ["Rohan", "Ananya", "Rajesh", "Kavita", "Siddharth", "Meera", "Arjun", "Pooja", "Aditya", "Neha", "Vikram", "Sneha", "Karan", "Tanvi"]
LAST_NAMES = ["Sharma", "Nair", "Iyer", "Gupta", "Deshmukh", "Kulkarni", "Mukherjee", "Rao", "Mehta", "Patel", "Verma", "Reddy", "Choudhury", "Bose"]
AMOUNTS = [39900, 49900, 79900, 99900, 129900, 149900, 199900, 249900, 299900, 499900]
DECLINES = [
    ("NODE_ROUTE_LATENCY_TIMEOUT", "Inter-bank switch latency exceeded threshold (5000ms)"),
    ("ERR_ISSUER_SETTLEMENT_0x82", "Sub-node authorization handshake refused at leg 2"),
    ("AUTH_INTERMEDIARY_DROP_0x33", "Payment gateway dropped handshake packet on network switch"),
    ("BANK_DOWNTIME_TRANSIENT", "Core banking server temporary timeout during peak processing"),
    ("insufficient_funds", "Customer account balance below required mandate threshold"),
    ("GATEWAY_ROUTING_FAILURE", "NPCI UPI switch dropped packet during multi-bank routing"),
]
REPLIES = [
    "Salary 7th ko credit hogi company se, tab auto-debit hone dena",
    "Mera payday 10 tarikh hai, tab tak payment link active rakhna please",
    "Abhi out of station train me hu network nahi aa raha, kal shaam tak UPI se pay karta hu",
    "Purana debit card block ho gaya tha, naya card Tuesday tak aayega tab update karunga",
    "GPay aur SBI server down chal raha hai subah se, raat 9 baje try karta hu",
    "Savings account me paise kal transfer honge FD liquidate hone ke baad, parso pay kar dunga",
    "Client ka invoice payment Monday 8th ko clear hoga, tabhi kar paunga",
    "Ye card mere husband ka hai, wo kal sham ko office se aake OTP denge tab ho payega",
    "Mahine ke aakhri din 30 tarikh ko salary aati hai, tab debit kar lena",
    "Bonus aane wala hai Friday ko, 12th ko settle karta hu pakka",
    "Mujhe invoice samajh nahi aaya, kal account team se confirm karke parso pay karunga",
    "Main kal subah 10 baje bank open hote hi transfer kar dunga",
]


def get_stepper_scenario(
    idx: int,
    opaque: bool = True,
    custom_reply: str | None = None,
    custom_amount: int | None = None,
) -> dict[str, Any]:
    rng = random.Random()
    f_name = FIRST_NAMES[idx % len(FIRST_NAMES)]
    l_name = LAST_NAMES[(idx + rng.randint(1, 10)) % len(LAST_NAMES)]
    full_name = f"{f_name} {l_name}"
    email = f"{f_name.lower()}.{l_name.lower()}@domain.in"
    paise = custom_amount if custom_amount is not None else AMOUNTS[(idx + rng.randint(0, len(AMOUNTS) - 1)) % len(AMOUNTS)]

    code, desc = DECLINES[idx % len(DECLINES)]
    if not opaque:
        code, desc = "insufficient_funds", "Insufficient funds"

    reply = custom_reply if (custom_reply and custom_reply.strip()) else REPLIES[idx % len(REPLIES)]
    return {
        "name": full_name,
        "email": email,
        "paise": paise,
        "amount_str": f"₹{paise // 100:,}",
        "code": code,
        "desc": desc,
        "reply": reply,
    }
