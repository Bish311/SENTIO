class SentioError(Exception):
    pass


class SignatureVerificationError(SentioError):
    pass


class PolicyViolationError(SentioError):
    pass


class InvalidCaseStateError(SentioError):
    pass


class LLMExecutionError(SentioError):
    pass


class CaseNotFoundError(SentioError):
    pass
