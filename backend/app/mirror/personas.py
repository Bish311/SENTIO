import random
from typing import Any


def generate_personas(count: int, seed: int) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    personas: list[dict[str, Any]] = []

    for index in range(1, count + 1):
        name_prefix = "Bish" if index % 2 != 0 else "Bishwayan"
        name = f"{name_prefix}{index}"
        email = f"{name.lower()}@example.com"
        phone_suffix = f"{index:04d}"[-4:]
        phone = f"+9190000{phone_suffix}"

        if rng.random() < 0.40:
            payday = rng.randint(1, 5)
        else:
            payday = rng.randint(6, 28)

        channel_pref = "whatsapp" if rng.random() < 0.65 else "email"
        locale = "hi" if rng.random() < 0.60 else "en"
        never_recovers = rng.random() < 0.10
        responsiveness = round(rng.uniform(0.2, 1.0), 2)

        personas.append(
            {
                "customer_id": f"cust_{index:04d}",
                "name": name,
                "email": email,
                "phone": phone,
                "locale": locale,
                "payday": payday,
                "channel_pref": channel_pref,
                "responsiveness": responsiveness,
                "never_recovers": never_recovers,
            }
        )

    return personas
