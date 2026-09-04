from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    admin,
    admin_db,
    cases_detail,
    cases_list,
    events_recent,
    health,
    metrics_batch,
    metrics_ledger,
    sim,
    webhooks,
)
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
    application.include_router(cases_list.router)
    application.include_router(cases_detail.router)
    application.include_router(metrics_batch.router)
    application.include_router(metrics_ledger.router)
    application.include_router(events_recent.router)
    application.include_router(admin.router)
    application.include_router(admin_db.router)
    return application


app = create_application()
