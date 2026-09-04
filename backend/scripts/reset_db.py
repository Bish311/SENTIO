import asyncio
from sqlalchemy import text
from app.core.db import async_session_factory


async def reset_database() -> None:
    tables = [
        "events",
        "promises",
        "payment_links",
        "interventions",
        "cases",
        "subscriptions",
        "customers",
        "jobs",
        "batches",
    ]
    async with async_session_factory() as session:
        for t in tables:
            try:
                await session.execute(text(f"TRUNCATE TABLE {t} CASCADE;"))
            except Exception as e:
                print(f"Warning truncating {t}: {e}")
        await session.commit()
        print("Database successfully wiped and ready for fresh real data!")


if __name__ == "__main__":
    asyncio.run(reset_database())
