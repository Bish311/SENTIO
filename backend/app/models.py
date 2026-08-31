from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    case_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    batch_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    actor: Mapped[str] = mapped_column(String(32))
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    dedup_key: Mapped[str | None] = mapped_column(String(128), unique=True, nullable=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON)


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    email: Mapped[str] = mapped_column(String(128))
    phone: Mapped[str] = mapped_column(String(32))
    locale: Mapped[str] = mapped_column(String(8))
    opted_out: Mapped[bool] = mapped_column(Boolean, default=False)
    sim_profile: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="customer")
    cases: Mapped[list["Case"]] = relationship(back_populates="customer")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    customer_id: Mapped[str] = mapped_column(String(64), ForeignKey("customers.id"))
    plan_id: Mapped[str] = mapped_column(String(64))
    amount_paise: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32))
    next_charge_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    card_expiry: Mapped[str | None] = mapped_column(String(8), nullable=True)
    retry_budget_used: Mapped[int] = mapped_column(Integer, default=0)
    arm: Mapped[str] = mapped_column(String(16))
    batch_id: Mapped[str] = mapped_column(String(64), index=True)

    customer: Mapped["Customer"] = relationship(back_populates="subscriptions")
    cases: Mapped[list["Case"]] = relationship(back_populates="subscription")


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    subscription_id: Mapped[str] = mapped_column(String(64), ForeignKey("subscriptions.id"))
    customer_id: Mapped[str] = mapped_column(String(64), ForeignKey("customers.id"))
    state: Mapped[str] = mapped_column(String(32))
    kind: Mapped[str] = mapped_column(String(32))
    amount_at_risk_paise: Mapped[int] = mapped_column(Integer)
    decline_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    root_cause: Mapped[str | None] = mapped_column(String(64), nullable=True)
    diagnosis_source: Mapped[str | None] = mapped_column(String(32), nullable=True)
    diagnosis_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    handoff_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    arm: Mapped[str] = mapped_column(String(16))
    batch_id: Mapped[str] = mapped_column(String(64), index=True)
    outcome: Mapped[str | None] = mapped_column(String(32), nullable=True)
    recovered_paise: Mapped[int] = mapped_column(Integer, default=0)
    opened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    subscription: Mapped["Subscription"] = relationship(back_populates="cases")
    customer: Mapped["Customer"] = relationship(back_populates="cases")
    interventions: Mapped[list["Intervention"]] = relationship(back_populates="case")
    promises: Mapped[list["Promise"]] = relationship(back_populates="case")


class Intervention(Base):
    __tablename__ = "interventions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"))
    seq: Mapped[int] = mapped_column(Integer)
    type: Mapped[str] = mapped_column(String(32))
    channel: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(32))
    proposed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    policy_receipt: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    executed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    case: Mapped["Case"] = relationship(back_populates="interventions")
    payment_links: Mapped[list["PaymentLink"]] = relationship(back_populates="intervention")


class PaymentLink(Base):
    __tablename__ = "payment_links"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    intervention_id: Mapped[str] = mapped_column(String(64), ForeignKey("interventions.id"))
    amount_paise: Mapped[int] = mapped_column(Integer)
    purpose: Mapped[str] = mapped_column(String(32))
    expire_by: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(32))

    intervention: Mapped["Intervention"] = relationship(back_populates="payment_links")


class Promise(Base):
    __tablename__ = "promises"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id"))
    promised_date: Mapped[date] = mapped_column(Date)
    amount_paise: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confidence: Mapped[float] = mapped_column(Float)
    source_event_id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        ForeignKey("events.id"),
    )
    status: Mapped[str] = mapped_column(String(32))

    case: Mapped["Case"] = relationship(back_populates="promises")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
    )
    type: Mapped[str] = mapped_column(String(64))
    run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(128), unique=True)


class Batch(Base):
    __tablename__ = "batches"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    seed: Mapped[int] = mapped_column(Integer)
    n_customers: Mapped[int] = mapped_column(Integer)
    failure_mix: Mapped[dict[str, Any]] = mapped_column(JSON)
    config: Mapped[dict[str, Any]] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(32), default="created")


class Policy(Base):
    __tablename__ = "policies"

    name: Mapped[str] = mapped_column(String(64), primary_key=True)
    params: Mapped[dict[str, Any]] = mapped_column(JSON)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
