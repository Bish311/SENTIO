from app.core.errors import InvalidCaseStateError

VALID_STATES = {
    "DETECTED",
    "DIAGNOSED",
    "INTERVENING",
    "AWAITING_OUTCOME",
    "RECOVERED",
    "ESCALATED",
    "CLOSED_LOST",
    "HUMAN_HANDOFF",
    "PREVENTED",
}

TERMINAL_STATES = {"RECOVERED", "CLOSED_LOST", "HUMAN_HANDOFF", "PREVENTED"}

VALID_TRANSITIONS = {
    "DETECTED": {"DIAGNOSED", "PREVENTED", "CLOSED_LOST", "HUMAN_HANDOFF"},
    "DIAGNOSED": {"INTERVENING", "HUMAN_HANDOFF", "CLOSED_LOST"},
    "INTERVENING": {"AWAITING_OUTCOME", "INTERVENING", "HUMAN_HANDOFF", "CLOSED_LOST"},
    "AWAITING_OUTCOME": {"RECOVERED", "INTERVENING", "CLOSED_LOST", "HUMAN_HANDOFF"},
    "ESCALATED": {"INTERVENING"},
}


def is_terminal_state(state: str) -> bool:
    return state in TERMINAL_STATES


def validate_transition(from_state: str, to_state: str) -> bool:
    if from_state not in VALID_STATES or to_state not in VALID_STATES:
        raise InvalidCaseStateError(f"Unknown state: {from_state} -> {to_state}")

    if from_state in TERMINAL_STATES:
        raise InvalidCaseStateError(f"Cannot transition from terminal state: {from_state}")

    allowed_targets = VALID_TRANSITIONS.get(from_state, set())
    if to_state not in allowed_targets:
        raise InvalidCaseStateError(f"Invalid state transition: {from_state} -> {to_state}")

    return True
