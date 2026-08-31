from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import cases, health, sim, webhooks
from app.core.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Sentio service starting up")
    yield
    logger.info("Sentio service shutting down")


def create_application() -> FastAPI:
    application = FastAPI(
        title="SENTIO API",
        version="0.1.0",
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(health.router)
    application.include_router(webhooks.router)
    application.include_router(sim.router)
    application.include_router(cases.router)
    return application


app = create_application()
