from fastapi import APIRouter
from pydantic import BaseModel

from app.core.clock import now_ist

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    clock_ist: str


@router.get("/health", response_model=HealthResponse)
async def check_health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        clock_ist=now_ist().isoformat(),
    )
