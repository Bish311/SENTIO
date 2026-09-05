# SENTIO

> Sense the failure. Guard the action. Recover the rupee.

SENTIO is a policy-governed, autonomous revenue recovery and proactive churn prevention platform for recurring subscription payments. It operates as a compliance-gated middleware between Razorpay and subscription customers, detecting failed charges, diagnosing root causes through a hybrid deterministic-neural engine, timing interventions around Indian payday cycles and RBI retry constraints, and gating every action through 8 deterministic compliance rules with tamper-evident cryptographic receipts.

Built for the **Razorpay AI Buildathon 2026** (Track 03 — AI Revenue Recovery).

---

## Table of Contents

- [How It Works](#how-it-works)
- [Key Results](#key-results)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Setup and Installation](#setup-and-installation)
- [Running the Application](#running-the-application)
- [Running Tests](#running-tests)
- [Architecture and Design](#architecture-and-design)
- [Environment Variables](#environment-variables)
- [License](#license)

---

## How It Works

SENTIO operates two complementary engines:

**Reactive Recovery (Cure Engine)** — A 7-stage autonomous loop that processes real Razorpay `payment.failed` webhooks end-to-end:

1. **Webhook Ingestion**: Validates HMAC-SHA256 signature and commits the event to an append-only audit store.
2. **Root-Cause Diagnosis**: Evaluates the decline code against a deterministic heuristic matrix (<5ms). Unrecognized codes invoke neural classification via OpenRouter (Touchpoint T1).
3. **Policy Gating**: Intercepts every proposed action against 8 deterministic compliance rules (quiet hours, contact caps, retry budgets) and generates a signed receipt for both ALLOW and DENY verdicts.
4. **Temporal Scheduling**: Evaluates legal daylight window (09:00–21:00 IST). Out-of-window proposals are rescheduled.
5. **Customer Outreach**: Generates contextual Latin-script Hinglish WhatsApp copy (Touchpoint T2) and creates a Razorpay payment link.
6. **Promise-to-Pay Parsing**: Extracts structured payment dates from unstructured customer replies (Touchpoint T3) and pauses retry ladders until the promised date.
7. **Settlement Verification**: Ingests `order.paid` webhooks and reconciles recovered revenue in integer paise.

**Proactive Prevention (Precaution Engine / Pulse)** — Daily automated sweeps scanning active subscriptions before bank debit execution dates to detect expiring card instruments (30-day window) and mandate retry budget limits, preventing involuntary churn and bank retry penalty fees.

---

## Key Results

Benchmarked on a deterministic 200-customer dataset (PRNG seed 42), comparing the full SENTIO pipeline against a naive gateway auto-retry baseline:

| Metric | Sentio AI (Arm A) | Naive Baseline (Arm B) | Delta |
|---|---|---|---|
| Recovery Rate | 79.5% (159/200) | 18.0% (36/200) | +61.5 percentage points |
| Recovered Revenue | Rs 72,841 | Rs 17,264 | 4.22x incremental lift |
| Policy Violations Blocked | 263 | 0 (unbounded) | 100% compliance |
| Contacts per Recovery | 1.84 | N/A | Optimized contact budget |

Full benchmark report: [`metrics.md`](metrics.md)

---

## Technology Stack

### Backend

| Component | Technology | Version |
|---|---|---|
| Runtime | Python | 3.14 |
| Framework | FastAPI | Latest |
| ORM | SQLAlchemy (async) | >= 2.0.44 |
| Database Driver | asyncpg | Latest |
| Schema Migrations | Alembic | Latest |
| HTTP Client | httpx | Latest |
| Validation | Pydantic v2 + pydantic-settings | Latest |
| Identifier Generation | python-ulid | Latest |
| Timezone Data | tzdata | Latest |
| Linting | ruff | Latest |
| Testing | pytest + pytest-asyncio | Latest |
| Test Database | aiosqlite | Latest |

### Frontend

| Component | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.3.3 |
| UI Library | React | 19.2.8 |
| Styling | Tailwind CSS | v4 |
| Component Primitives | shadcn/ui (class-variance-authority, clsx, tailwind-merge) | Latest |
| Data Fetching | SWR | >= 2.5.1 |
| Icons | lucide-react | Latest |
| Linting | ESLint (eslint-config-next) | Latest |

### Infrastructure

| Component | Technology |
|---|---|
| Database | PostgreSQL 18 (local via Docker) / Supabase PG16 (production) |
| LLM Gateway | OpenRouter REST API (primary: openai/gpt-5.6-luna, fallback: deepseek/deepseek-v4-flash) |
| Backend Hosting | GCP e2-micro + ngrok static domain |
| Frontend Hosting | Vercel |
| Containerization | Docker Compose (PostgreSQL only) |

---

## Repository Structure

```
SENTIO/
  backend/
    alembic/                    # Database migration scripts
      versions/
        0001_initial_schema.py
    app/
      api/                      # FastAPI route handlers
        admin.py                #   Kill switch, policy denials, event export
        admin_db.py             #   Database administration endpoints
        admin_stepper.py        #   Live neural stepper pipeline
        admin_sweep.py          #   Precaution engine sweep trigger
        admin_verify.py         #   System verification endpoints
        cases_detail.py         #   Case drill-down detail
        cases_list.py           #   Case listing and filtering
        events_recent.py        #   Real-time audit event stream
        health.py               #   Health check
        metrics_batch.py        #   Batch performance metrics
        metrics_ledger.py       #   Two-arm experiment ledger
        sim.py                  #   Simulation batch trigger
        stepper_scenarios.py    #   Multi-scenario test definitions
        stepper_stages.py       #   Stepper stage execution logic
        webhooks.py             #   Razorpay webhook ingestion
      cases/                    # Case state machine and recovery ladders
        engine.py
        ladders.py
        live_pipeline.py
        live_settle.py
        machine.py
      chrono/                   # Temporal intelligence and PTP scheduling
        jobs.py
        ptp.py
        ptp_book.py
        timing.py
      core/                     # Configuration, database, logging, clock
        config.py
        db.py
        errors.py
        logging.py
        clock.py
      guard/                    # Deterministic policy engine (8 rules)
        engine.py
        receipt.py
        rules.py
        verdict.py
      lens/                     # Root-cause diagnosis (matrix + T1 fallback)
        diagnose.py
        matrix.py
      llm/                      # OpenRouter gateway (T1, T2, T3 contracts)
        client.py
        contracts.py
        prompts.py
      mirror/                   # Wire-identical Razorpay simulator
        batch_gen.py
        personas.py
        probabilities.py
        replay.py
        replies.py
        responder.py
      pulse/                    # Proactive churn prevention sweeps
        sweep.py
      reach/                    # Side-effect executor (links, channels)
        channels.py
        draft.py
        executor.py
        links.py
        rzp.py
      spine/                    # Append-only event store and projections
        ingest.py
        project_case.py
        project_intv.py
        project_misc.py
        projector.py
        verify.py
      models.py                 # SQLAlchemy schema (10 entities)
      main.py                   # FastAPI application factory
      worker.py                 # Background job poller and dispatcher
    eval/                       # Evaluation fixtures
      guard_cases.json
      message_lint.json
      opaque_codes.json
      ptp_replies.json
    scripts/                    # Simulation and verification scripts
      experiment_metrics.py
      experiment_runner.py
      rebuild_projections.py
      reset_db.py
      run_two_arm_experiment.py
      sim_agent.py
      sim_baseline.py
      smoke.py
      verify_reproducibility.py
    tests/                      # Automated test suite (56 tests)
      conftest.py
      test_api.py
      test_architecture.py
      test_cases.py
      test_chrono.py
      test_experiment.py
      test_guard.py
      test_lens.py
      test_llm_contracts.py
      test_mirror.py
      test_reach.py
      test_spine.py
  frontend/
    app/                        # Next.js App Router pages
      page.tsx                  #   Command Center (KPIs, flowcharts, pipeline)
      cases/[id]/page.tsx       #   Case drill-down audit trail
      admin/page.tsx            #   Admin console (kill switch, stepper, sweeps)
      layout.tsx                #   Root layout with navigation
      globals.css               #   Custom dual-palette theme engine
    components/                 # Reusable UI components
      arm-comparison.tsx        #   Two-arm experiment ledger
      case-timeline.tsx         #   Chronological case audit trail
      counter.tsx               #   Live KPI counter cards
      delivery-tracker.tsx      #   WhatsApp delivery tracker
      event-ticker.tsx          #   Real-time streaming audit ticker
      kill-switch.tsx           #   Emergency compliance toggle
      navbar.tsx                #   Navigation header with health badge
      pipeline-board.tsx        #   Kanban case pipeline board
      precaution-flowchart.tsx  #   5-stage Pulse precaution flowchart
      pulse-panel.tsx           #   Pulse engine control panel
      receipt-chip.tsx          #   Policy verdict badge with inspector
      system-verify-bar.tsx     #   System verification status bar
      theme-toggle.tsx          #   Light/dark theme toggle
      transaction-flowchart.tsx #   7-stage recovery flowchart
    lib/                        # Shared utilities
      api.ts                    #   SWR fetchers and mutation helpers
      format.ts                 #   Paise-to-rupee and IST formatters
      types.ts                  #   TypeScript data contracts
  architecture.md               # System architecture document
  design.md                     # Detailed system design document
  metrics.md                    # Frozen two-arm experiment benchmark
  docker-compose.yml            # PostgreSQL 18 container
```

---

## Setup and Installation

### Prerequisites

- Python 3.14 or higher
- Node.js 22 or higher
- Docker and Docker Compose (for PostgreSQL)
- A Razorpay test-mode account (for `RZP_KEY_ID`, `RZP_KEY_SECRET`, `RZP_WEBHOOK_SECRET`)
- An OpenRouter API key (for `OPENROUTER_API_KEY`)

### 1. Clone the Repository

```bash
git clone https://github.com/Bish311/SENTIO.git
cd SENTIO
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts a PostgreSQL 18 container on port `5433` with database `sentio`, user `postgres`, password `postgres`.

### 3. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt -r requirements-dev.txt
```

### 4. Configure Environment

Create a `.env` file in the project root with the following variables (see [Environment Variables](#environment-variables) for details):

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/sentio
RZP_KEY_ID=rzp_test_...
RZP_KEY_SECRET=...
RZP_WEBHOOK_SECRET=...
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
LLM_T1_MODEL=openai/gpt-5.6-luna
LLM_T2_MODEL=openai/gpt-5.6-luna
LLM_T3_MODEL=openai/gpt-5.6-luna
LLM_FALLBACK_MODEL=deepseek/deepseek-v4-flash
ADMIN_TOKEN=your_admin_token
CHANNEL_MODE=sim
TZ=Asia/Kolkata
```

### 5. Run Database Migrations

```bash
cd backend
alembic upgrade head
```

### 6. Frontend Setup

```bash
cd frontend
npm install
```

---

## Running the Application

### Start the Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive documentation is served at `http://localhost:8000/docs`.

### Start the Frontend

```bash
cd frontend
npm run dev
```

The dashboard will be available at `http://localhost:3000`.

### Run the Two-Arm Experiment

```bash
cd backend
python scripts/run_two_arm_experiment.py
```

This executes the full 200-customer seeded simulation across both experiment arms and outputs the benchmark summary.

### Verify Reproducibility

```bash
cd backend
python scripts/verify_reproducibility.py
```

Confirms byte-for-byte reproducibility from seed 42 and validates that all state projections can be rebuilt from the immutable event store.

---

## Running Tests

### Backend Tests

```bash
cd backend
python -m pytest tests/ -q
```

Expected output: `56 passed`.

### Backend Linting

```bash
cd backend
ruff check .
```

Expected output: `All checks passed!`

### Frontend Linting

```bash
cd frontend
npm run lint
```

### Frontend Production Build

```bash
cd frontend
npm run build
```

---

## Architecture and Design

Detailed technical documentation is available in the following files:

- [**architecture.md**](architecture.md) — High-level system topology, subsystem responsibilities, data flow diagrams, event sourcing design, AST safety invariants, and infrastructure deployment topology.

- [**design.md**](design.md) — Detailed design specifications for the neural touchpoints (T1/T2/T3), model routing and failover protocol, Guard policy engine rule definitions, cryptographic receipt schema, Chrono temporal management, Pulse precaution engine, multi-scenario stepper engine, Next.js presentation architecture, and two-arm scientific experimentation methodology.

- [**metrics.md**](metrics.md) — Frozen benchmark results from the deterministic two-arm experiment (seed 42, 200 customers): 79.5% recovery rate, 4.22x incremental lift, 263 policy violations intercepted.

---

## Environment Variables

All environment variables are read exclusively through `backend/app/core/config.py` via Pydantic Settings.

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL async connection string | `postgresql+asyncpg://postgres:postgres@localhost:5433/sentio` |
| `RZP_KEY_ID` | Razorpay test-mode API key ID | `rzp_test_placeholder` |
| `RZP_KEY_SECRET` | Razorpay test-mode API key secret | `placeholder_secret` |
| `RZP_WEBHOOK_SECRET` | Razorpay webhook HMAC-SHA256 secret | `placeholder_webhook_secret` |
| `OPENROUTER_API_KEY` | OpenRouter API key for LLM inference | `sk-or-placeholder` |
| `OPENROUTER_BASE_URL` | OpenRouter API base URL | `https://openrouter.ai/api/v1` |
| `LLM_T1_MODEL` | Model for opaque decline diagnosis | `openai/gpt-5.6-luna` |
| `LLM_T2_MODEL` | Model for Hinglish message drafting | `openai/gpt-5.6-luna` |
| `LLM_T3_MODEL` | Model for PTP date extraction | `openai/gpt-5.6-luna` |
| `LLM_FALLBACK_MODEL` | Fallback model on transport/schema failure | `deepseek/deepseek-v4-flash` |
| `ADMIN_TOKEN` | Token for admin endpoint authentication | `placeholder_admin_token` |
| `CHANNEL_MODE` | Communication channel mode (`sim` or `live`) | `sim` |
| `TZ` | Application timezone | `Asia/Kolkata` |

---

## License

This project was built for the Razorpay AI Buildathon 2026. All data is 100% synthetic (Razorpay test mode). No live API keys or real customer data are used.
