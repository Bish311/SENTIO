from typing import Any

LADDERS: dict[str, list[dict[str, Any]]] = {
    "cash_timing": [
        {
            "seq": 1,
            "type": "message",
            "channel_strategy": "preferred",
            "delay_hours": 0,
            "requires_payday": True,
            "include_link": True,
        },
        {
            "seq": 2,
            "type": "message",
            "channel_strategy": "preferred",
            "delay_hours": 48,
            "requires_payday": False,
            "include_link": True,
        },
        {
            "seq": 3,
            "type": "message",
            "channel_strategy": "email",
            "delay_hours": 72,
            "requires_payday": False,
            "include_link": True,
        },
        {
            "seq": 4,
            "type": "handoff",
            "channel_strategy": "internal",
            "delay_hours": 0,
            "requires_payday": False,
            "include_link": False,
        },
    ],
    "friction": [
        {
            "seq": 1,
            "type": "message",
            "channel_strategy": "preferred",
            "delay_hours": 0,
            "requires_payday": False,
            "include_link": True,
        },
        {
            "seq": 2,
            "type": "message",
            "channel_strategy": "alternate",
            "delay_hours": 24,
            "requires_payday": False,
            "include_link": True,
        },
        {
            "seq": 3,
            "type": "handoff",
            "channel_strategy": "internal",
            "delay_hours": 0,
            "requires_payday": False,
            "include_link": False,
        },
    ],
    "dead_instrument": [
        {
            "seq": 1,
            "type": "update_card_link",
            "channel_strategy": "preferred",
            "delay_hours": 0,
            "requires_payday": False,
            "include_link": True,
        },
        {
            "seq": 2,
            "type": "update_card_link",
            "channel_strategy": "email",
            "delay_hours": 48,
            "requires_payday": False,
            "include_link": True,
        },
        {
            "seq": 3,
            "type": "handoff",
            "channel_strategy": "internal",
            "delay_hours": 0,
            "requires_payday": False,
            "include_link": False,
        },
    ],
    "transient": [
        {
            "seq": 1,
            "type": "retry",
            "channel_strategy": "none",
            "delay_hours": 4,
            "requires_payday": False,
            "include_link": False,
        },
        {
            "seq": 2,
            "type": "retry",
            "channel_strategy": "none",
            "delay_hours": 24,
            "requires_payday": False,
            "include_link": False,
        },
        {
            "seq": 3,
            "type": "message",
            "channel_strategy": "preferred",
            "delay_hours": 24,
            "requires_payday": False,
            "include_link": True,
        },
        {
            "seq": 4,
            "type": "handoff",
            "channel_strategy": "internal",
            "delay_hours": 0,
            "requires_payday": False,
            "include_link": False,
        },
    ],
    "budget_burned": [
        {
            "seq": 1,
            "type": "message",
            "channel_strategy": "preferred",
            "delay_hours": 0,
            "requires_payday": False,
            "include_link": True,
        },
        {
            "seq": 2,
            "type": "message",
            "channel_strategy": "email",
            "delay_hours": 48,
            "requires_payday": False,
            "include_link": True,
        },
        {
            "seq": 3,
            "type": "handoff",
            "channel_strategy": "internal",
            "delay_hours": 0,
            "requires_payday": False,
            "include_link": False,
        },
    ],
    "other": [
        {
            "seq": 1,
            "type": "message",
            "channel_strategy": "preferred",
            "delay_hours": 0,
            "requires_payday": False,
            "include_link": True,
        },
        {
            "seq": 2,
            "type": "message",
            "channel_strategy": "preferred",
            "delay_hours": 24,
            "requires_payday": False,
            "include_link": True,
        },
        {
            "seq": 3,
            "type": "handoff",
            "channel_strategy": "internal",
            "delay_hours": 0,
            "requires_payday": False,
            "include_link": False,
        },
    ],
}


def get_ladder_step(root_cause: str, seq: int) -> dict[str, Any] | None:
    ladder = LADDERS.get(root_cause, LADDERS["other"])
    for step in ladder:
        if step["seq"] == seq:
            return step
    return None
