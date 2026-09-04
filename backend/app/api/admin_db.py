from typing import Any
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.db import get_db

router = APIRouter(prefix="/admin", tags=["admin"])

async def verify_admin_token(x_admin_token: str = Header(...)) -> str:
    if x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    return x_admin_token

@router.post("/reset-db")
async def reset_db_endpoint(
    token: str = Depends(verify_admin_token),
    session: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    tables = [
        "events", "promises", "payment_links", "interventions",
        "cases", "subscriptions", "customers", "jobs", "batches"
    ]
    for t in tables:
        try:
            await session.execute(text(f"TRUNCATE TABLE {t} CASCADE;"))
        except Exception as e:
            print(f"Error truncating {t}: {e}")
    await session.commit()
    return {"status": "ok", "message": "Database wiped successfully. Ready for fresh real data."}
