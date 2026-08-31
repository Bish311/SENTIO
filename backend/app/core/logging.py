import logging
import sys

from app.core.config import settings


def setup_logging() -> logging.Logger:
    logger = logging.getLogger("sentio")
    logger.setLevel(settings.LOG_LEVEL)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            '{"time":"%(asctime)s","level":"%(levelname)s","name":"%(name)s","message":"%(message)s"}'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


logger = setup_logging()
