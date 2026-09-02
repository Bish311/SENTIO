from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("case_id", sa.String(length=64), nullable=True),
        sa.Column("batch_id", sa.String(length=64), nullable=True),
        sa.Column("actor", sa.String(length=32), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("dedup_key", sa.String(length=128), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dedup_key"),
    )
    op.create_index(op.f("ix_events_case_id"), "events", ["case_id"], unique=False)
    op.create_index(op.f("ix_events_batch_id"), "events", ["batch_id"], unique=False)
    op.create_index(op.f("ix_events_event_type"), "events", ["event_type"], unique=False)

    op.create_table(
        "customers",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("email", sa.String(length=128), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=False),
        sa.Column("locale", sa.String(length=8), nullable=False),
        sa.Column("opted_out", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sim_profile", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("customer_id", sa.String(length=64), nullable=False),
        sa.Column("plan_id", sa.String(length=64), nullable=False),
        sa.Column("amount_paise", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("next_charge_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("card_expiry", sa.String(length=8), nullable=True),
        sa.Column("retry_budget_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("arm", sa.String(length=16), nullable=False),
        sa.Column("batch_id", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_subscriptions_batch_id"), "subscriptions", ["batch_id"], unique=False)

    op.create_table(
        "cases",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("subscription_id", sa.String(length=64), nullable=False),
        sa.Column("customer_id", sa.String(length=64), nullable=False),
        sa.Column("state", sa.String(length=32), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("amount_at_risk_paise", sa.Integer(), nullable=False),
        sa.Column("decline_code", sa.String(length=64), nullable=True),
        sa.Column("root_cause", sa.String(length=64), nullable=True),
        sa.Column("diagnosis_source", sa.String(length=32), nullable=True),
        sa.Column("diagnosis_confidence", sa.Float(), nullable=True),
        sa.Column("handoff_flag", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("arm", sa.String(length=16), nullable=False),
        sa.Column("batch_id", sa.String(length=64), nullable=False),
        sa.Column("outcome", sa.String(length=32), nullable=True),
        sa.Column("recovered_paise", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"]),
        sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_cases_batch_id"), "cases", ["batch_id"], unique=False)

    op.create_table(
        "interventions",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("case_id", sa.String(length=64), nullable=False),
        sa.Column("seq", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("channel", sa.String(length=32), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("proposed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("policy_receipt", sa.JSON(), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "payment_links",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("intervention_id", sa.String(length=64), nullable=False),
        sa.Column("amount_paise", sa.Integer(), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("expire_by", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["intervention_id"], ["interventions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "promises",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("case_id", sa.String(length=64), nullable=False),
        sa.Column("promised_date", sa.Date(), nullable=False),
        sa.Column("amount_paise", sa.Integer(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("source_event_id", sa.BigInteger(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"]),
        sa.ForeignKeyConstraint(["source_event_id"], ["events.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "jobs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("run_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key"),
    )
    op.create_index(op.f("ix_jobs_run_at"), "jobs", ["run_at"], unique=False)

    op.create_table(
        "batches",
        sa.Column("id", sa.String(length=64), nullable=False),
        sa.Column("seed", sa.Integer(), nullable=False),
        sa.Column("n_customers", sa.Integer(), nullable=False),
        sa.Column("failure_mix", sa.JSON(), nullable=False),
        sa.Column("config", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="created"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "policies",
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("params", sa.JSON(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.PrimaryKeyConstraint("name"),
    )


def downgrade() -> None:
    op.drop_table("policies")
    op.drop_table("batches")
    op.drop_index(op.f("ix_jobs_run_at"), table_name="jobs")
    op.drop_table("jobs")
    op.drop_table("promises")
    op.drop_table("payment_links")
    op.drop_table("interventions")
    op.drop_index(op.f("ix_cases_batch_id"), table_name="cases")
    op.drop_table("cases")
    op.drop_index(op.f("ix_subscriptions_batch_id"), table_name="subscriptions")
    op.drop_table("subscriptions")
    op.drop_table("customers")
    op.drop_index(op.f("ix_events_event_type"), table_name="events")
    op.drop_index(op.f("ix_events_batch_id"), table_name="events")
    op.drop_index(op.f("ix_events_case_id"), table_name="events")
    op.drop_table("events")
