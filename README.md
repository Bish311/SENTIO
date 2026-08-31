# SENTIO

> Sense the failure. Guard the action. Recover the rupee.

A policy-governed revenue recovery layer between payment gateway (Razorpay) and customers.

## Overview

SENTIO detects failed subscription charges, diagnoses root causes, times customer interventions around paydays and regulatory retry limits, and gates every action through deterministic compliance rules with full audit receipts.

## Architecture

- **Backend:** FastAPI, PostgreSQL, SQLAlchemy (asyncpg), Alembic
- **Frontend:** Next.js (App Router), Tailwind CSS, shadcn/ui, SWR
- **Engine Pipeline:** Sense (Spine) → Read (Lens) → Time (Chrono) → Gate (Guard) → Act (Reach) → Prove (Ledger)

## Getting Started

### Prerequisites

- Python 3.14+
- Node.js 22+
- PostgreSQL 18

### Backend Setup

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
