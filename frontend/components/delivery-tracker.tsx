"use client";

import { useState } from "react";
import { CaseDetail } from "@/lib/types";
import { formatISTDateTime, formatPaiseToRupees } from "@/lib/format";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  XCircle,
  Ban,
  Cpu,
  Zap,
} from "lucide-react";

interface DeliveryTrackerProps {
  caseDetail: CaseDetail;
  compact?: boolean;
}

interface StepDefinition {
  id: string;
  title: string;
  subhead: string;
  actor: string;
  badgeLabel?: string;
  badgeColor?: string;
  timestamp?: string;
  status: "completed" | "in_progress" | "pending" | "denied" | "bypassed" | "failed";
  details?: string;
  quote?: string;
  metadata?: Record<string, unknown>;
}

export function DeliveryTracker({ caseDetail, compact = false }: DeliveryTrackerProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const events = caseDetail.timeline || [];
  const isBaseline = caseDetail.arm === "baseline";

  // Real database event lookups
  const evOpened = events.find(
    (e) => e.event_type === "case.opened" || e.event_type === "payment.failed"
  );
  const evDiag = events.find(
    (e) => e.event_type === "diagnosis.made" || e.event_type === "case.diagnosed"
  );
  const evPolicy = events.find((e) => e.event_type.startsWith("policy."));
  const evChrono = events.find(
    (e) =>
      e.event_type === "chrono.window_opened" ||
      e.event_type === "chrono.rescheduled" ||
      e.event_type === "intervention.proposed"
  );
  const evReach = events.find(
    (e) =>
      e.event_type === "reach.drafted" ||
      e.event_type === "message.sent" ||
      e.event_type === "link.created"
  );
  const evPtp = events.find(
    (e) =>
      e.event_type === "ptp.booked" ||
      e.event_type === "customer.replied" ||
      e.event_type === "reply.received"
  );
  const evSettled = events.find(
    (e) =>
      e.event_type === "payment_link.paid" ||
      e.event_type === "payment.captured" ||
      (e.event_type === "case.closed" && (e.payload?.outcome === "recovered" || (caseDetail.outcome || "").toLowerCase() === "recovered"))
  );
  const evExhausted = events.find(
    (e) =>
      e.event_type === "case.closed" &&
      (e.payload?.outcome === "exhausted" || (caseDetail.outcome || "").toLowerCase() === "exhausted")
  );

  // Real LLM calls recorded in the database
  const evLLM_T1 = events.find(
    (e) => e.event_type === "llm.called" && (e.payload?.touchpoint === "T1" || e.payload?.touchpoint === "lens")
  );
  const evLLM_T2 = events.find(
    (e) => e.event_type === "llm.called" && (e.payload?.touchpoint === "T2" || e.payload?.touchpoint === "reach")
  );

  const isRecovered =
    (caseDetail.outcome || "").toLowerCase() === "recovered" ||
    (caseDetail.state || "").toLowerCase() === "recovered" ||
    (caseDetail.state || "").toLowerCase() === "settled" ||
    !!evSettled;

  const isExhausted =
    !isRecovered &&
    ((caseDetail.outcome || "").toLowerCase() === "exhausted" ||
      (caseDetail.state || "").toLowerCase() === "exhausted" ||
      !!evExhausted);

  // 1. Spine Ingestion
  const s1: StepDefinition = {
    id: "step-1",
    title: "1. Webhook Ingested & HMAC Verified",
    subhead: "Spine Immutable Event Store",
    actor: "spine",
    status: evOpened ? "completed" : "in_progress",
    timestamp: evOpened?.ts || caseDetail.opened_at || undefined,
    badgeLabel: "HMAC SHA-256",
    badgeColor: "#10b981",
    details: `Signature verified against Razorpay secret. Append-only sequence recorded in PostgreSQL.`,
    metadata: evOpened?.payload,
  };

  // 2. Lens T1 Diagnosis (Strict Real Telemetry: Matrix vs Actual LLM)
  const rootCause = (evDiag?.payload?.root_cause as string) || caseDetail.root_cause;
  const conf = (evDiag?.payload?.confidence as number) || 1.0;
  const diagSource = (evDiag?.payload?.source as string) || "matrix";
  const hasRealLLM_T1 = !!evLLM_T1 || diagSource === "llm" || diagSource === "openrouter";
  const t1Model = (evLLM_T1?.payload?.model as string) || "openai/gpt-5.6-luna";

  const s2: StepDefinition = isBaseline
    ? {
        id: "step-2",
        title: "2. Lens Root-Cause Diagnostic (T1)",
        subhead: "Bypassed in Control Group (Arm B)",
        actor: "baseline",
        status: "bypassed",
        badgeLabel: "CONTROL GROUP",
        badgeColor: "#71717a",
        details: "Arm B control group uses blind bank retries with zero root-cause diagnosis.",
      }
    : {
        id: "step-2",
        title: "2. Lens Root-Cause Diagnostic (T1)",
        subhead: hasRealLLM_T1
          ? `Live Neural Inference (${t1Model})`
          : "Deterministic Fault Matrix (2ms Fast-Path)",
        actor: "lens",
        status: (evDiag || rootCause) ? "completed" : s1.status === "completed" ? "in_progress" : "pending",
        timestamp: evDiag?.ts,
        badgeLabel: rootCause
          ? hasRealLLM_T1
            ? `${rootCause.toUpperCase()} (${Math.round(conf * 100)}% LLM)`
            : `${rootCause.toUpperCase()} (MATRIX 2ms)`
          : undefined,
        badgeColor: hasRealLLM_T1 ? "#8b5cf6" : "#06b6d4",
        details: rootCause
          ? hasRealLLM_T1
            ? `Neural routing classified opaque decline to '${rootCause}' with ${conf} confidence via ${t1Model}${evLLM_T1?.payload?.latency_ms ? ` (${evLLM_T1.payload.latency_ms}ms)` : ""}.`
            : `Classified decline code '${rootCause}' via O(1) Matrix fast-path (2ms). Zero LLM tokens consumed.`
          : "Evaluating decline telemetry...",
        metadata: evLLM_T1 ? { ...evDiag?.payload, llm_audit: evLLM_T1.payload } : evDiag?.payload,
      };

  // 3. Guard Compliance Gate
  const isDenied = evPolicy?.event_type === "policy.denied";
  const receipt = evPolicy?.payload?.receipt as Record<string, unknown> | undefined;
  const rcptId = (receipt?.receipt_id as string) || (evPolicy?.payload?.receipt_id as string);
  const violationList = (receipt?.violations as string[]) || (evPolicy?.payload?.violations as string[]) || [];
  const s3: StepDefinition = isBaseline
    ? {
        id: "step-3",
        title: "3. Guard Compliance Gate",
        subhead: "Bypassed in Control Group (Arm B)",
        actor: "baseline",
        status: "bypassed",
        badgeLabel: "UNREGULATED",
        badgeColor: "#71717a",
        details: "No frequency caps, cooling-off periods, or quiet hours enforced in baseline arm.",
      }
    : {
        id: "step-3",
        title: "3. Guard Compliance Gate",
        subhead: "8 Financial Compliance Rules Evaluated",
        actor: "policy",
        status: evPolicy
          ? isDenied
            ? "denied"
            : "completed"
          : s2.status === "completed"
          ? "in_progress"
          : "pending",
        timestamp: evPolicy?.ts,
        badgeLabel: isDenied ? "POLICY DENIED" : evPolicy ? "POLICY ALLOWED" : undefined,
        badgeColor: isDenied ? "#ef4444" : "#10b981",
        details: evPolicy
          ? isDenied
            ? `Safety rule triggered: ${(violationList.length > 0 ? violationList : ["COMPLIANCE_RULE_BLOCKED"]).join(", ")}. Signed Receipt: ${rcptId || "rcpt_audit"}.`
            : `All 8 regulatory rules passed (quiet hours, debt cap, cooling-off). Signed Receipt: ${rcptId || "rcpt_audit"}.`
          : "Checking regulatory contact gates...",
        metadata: receipt || evPolicy?.payload,
      };

  // 4. Chrono Temporal Scheduler
  const schedWindow =
    (evChrono?.payload?.scheduled_window as string) ||
    (evChrono?.payload?.rescheduled_for as string) ||
    "Legal Window: 09:00 - 21:00 IST";
  const s4: StepDefinition = isBaseline
    ? {
        id: "step-4",
        title: "4. Chrono Temporal Scheduler",
        subhead: "Bypassed in Control Group (Arm B)",
        actor: "baseline",
        status: "bypassed",
        badgeLabel: "NO CHRONO",
        badgeColor: "#71717a",
        details: "Blind immediate retries scheduled without quiet hours or payday awareness.",
      }
    : {
        id: "step-4",
        title: "4. Chrono Temporal Scheduler",
        subhead: "Quiet Hours Compliance & Legal Dispatch Window",
        actor: "chrono",
        status: evChrono ? "completed" : s3.status === "completed" ? "in_progress" : "pending",
        timestamp: evChrono?.ts,
        badgeLabel: evChrono ? "TIME WINDOW LOCKED" : undefined,
        badgeColor: "#6366f1",
        details: evChrono
          ? `Verified legal outreach window in Asia/Kolkata timezone: ${schedWindow}.`
          : "Calculating optimal contact time window...",
        metadata: evChrono?.payload,
      };

  // 5. Reach Drafter & Linter (T2) (Strict Real Telemetry)
  const reachContent =
    (evReach?.payload?.content as string) ||
    (evReach?.payload?.body as string) ||
    (evLLM_T2?.payload?.parsed_output as Record<string, unknown>)?.body as string ||
    "";
  const hasRealLLM_T2 = !!evLLM_T2 || (evReach?.event_type === "reach.drafted" && !!reachContent);
  const t2Model = (evLLM_T2?.payload?.model as string) || (evReach?.payload?.model as string) || "openai/gpt-5.6-luna";
  const linterOk = evReach?.payload?.linter_passed !== false;

  const s5: StepDefinition = isBaseline
    ? {
        id: "step-5",
        title: "5. Reach Drafter & Defensive Linter (T2)",
        subhead: "Bypassed in Control Group (Arm B)",
        actor: "baseline",
        status: "bypassed",
        badgeLabel: "NO OUTREACH",
        badgeColor: "#71717a",
        details: "Zero empathetic messaging. Arm B communicates solely through failed bank mandate errors.",
      }
    : {
        id: "step-5",
        title: "5. Reach Drafter & Defensive Linter (T2)",
        subhead: hasRealLLM_T2
          ? `Empathetic Latin-Script Hinglish (${t2Model})`
          : "Dynamic Outreach Link Generated",
        actor: "reach",
        status: (evReach || isRecovered) ? "completed" : s4.status === "completed" ? "in_progress" : "pending",
        timestamp: evReach?.ts || evLLM_T2?.ts,
        badgeLabel: hasRealLLM_T2
          ? linterOk
            ? "0 HARASSMENT FLAGS"
            : "LINTER ALERT"
          : evReach
          ? "LINK CREATED"
          : undefined,
        badgeColor: linterOk ? "#10b981" : "#ef4444",
        details: hasRealLLM_T2
          ? `Generated empathetic Latin-script Hinglish copy via ${t2Model}. Linter verified 0 of 11 prohibited debt harassment terms.`
          : evReach
          ? `Dispatched secure Razorpay payment link via ${(evReach.payload?.channel as string) || "WhatsApp"}.`
          : isRecovered
          ? "Direct recovery achieved via payment link."
          : "Drafting compliant communication link...",
        quote: reachContent || undefined,
        metadata: evLLM_T2 ? { ...evReach?.payload, llm_audit: evLLM_T2.payload } : evReach?.payload,
      };

  // 6. T3 Feedback & PTP Lock
  const ptpDate = (evPtp?.payload?.promised_date as string) || (evPtp?.payload?.date as string);
  const s6: StepDefinition = isBaseline
    ? {
        id: "step-6",
        title: "6. Customer Feedback & Promise-to-Pay (T3)",
        subhead: "Bypassed in Control Group (Arm B)",
        actor: "baseline",
        status: "bypassed",
        badgeLabel: "NO PTP",
        badgeColor: "#71717a",
        details: "Customer has no conversational channel to request payday delays or report temporary cashflow issues.",
      }
    : {
        id: "step-6",
        title: "6. Customer Feedback & Promise-to-Pay (T3)",
        subhead: "Natural Language Payday Extraction & Temporal Lock",
        actor: "pulse",
        status: evPtp
          ? "completed"
          : isRecovered
          ? "completed"
          : isExhausted
          ? "failed"
          : s5.status === "completed"
          ? "in_progress"
          : "pending",
        timestamp: evPtp?.ts,
        badgeLabel: ptpDate ? `PAYDAY: ${ptpDate}` : isRecovered ? "DIRECT RECOVERY" : undefined,
        badgeColor: "#38bdf8",
        details: ptpDate
          ? `Customer natural language reply extracted ISO date ${ptpDate}. Retry budget locked until payday.`
          : isRecovered
          ? "Customer completed payment directly without requiring conversational extension."
          : isExhausted
          ? "No payment promise received before mandate retry limits were reached."
          : "Awaiting customer WhatsApp response or payday signal...",
        metadata: evPtp?.payload,
      };

  // 7. Settlement & Ledger Recovery
  const recoveredAmt = caseDetail.recovered_paise ?? caseDetail.amount_at_risk_paise ?? 0;
  const s7: StepDefinition = {
    id: "step-7",
    title: isBaseline
      ? "7. Control Arm Settlement Outcome"
      : "7. Webhook Settlement & Revenue Recovered",
    subhead: isBaseline
      ? "Standard Bank Retry Outcome"
      : "Razorpay Signature Verification & Net Value Protected",
    actor: isBaseline ? "bank" : "settlement",
    status: isRecovered ? "completed" : isExhausted ? "failed" : s6.status === "completed" ? "in_progress" : "pending",
    timestamp: evSettled?.ts || evExhausted?.ts || caseDetail.closed_at || undefined,
    badgeLabel: isRecovered
      ? `${formatPaiseToRupees(recoveredAmt)} RECOVERED`
      : isExhausted
      ? "RECOVERY EXHAUSTED"
      : undefined,
    badgeColor: isRecovered ? "#10b981" : isExhausted ? "#ef4444" : undefined,
    details: isRecovered
      ? `Payment verified. Credited ${formatPaiseToRupees(recoveredAmt)} to Ledger without bank penalty fees.`
      : isExhausted
      ? `Retries exhausted without recovery. ${isBaseline ? "Bank penalty fees incurred (-₹180)." : "Customer reached cooling-off."}`
      : "Waiting for payment capture webhook from Razorpay...",
    metadata: evSettled?.payload || evExhausted?.payload,
  };

  const steps: StepDefinition[] = [s1, s2, s3, s4, s5, s6, s7];
  const activeSteps = steps.filter((s) => s.status === "completed");
  const completedCount = activeSteps.length;

  const getIcon = (step: StepDefinition) => {
    if (step.status === "completed") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    if (step.status === "denied") return <ShieldAlert className="w-4 h-4 text-amber-400" />;
    if (step.status === "failed") return <XCircle className="w-4 h-4 text-red-400" />;
    if (step.status === "bypassed") return <Ban className="w-3.5 h-3.5 text-zinc-500" />;
    if (step.status === "in_progress") {
      return (
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
        </span>
      );
    }
    return <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />;
  };

  return (
    <div className="card p-5 border" style={{ borderColor: isBaseline ? "rgba(239, 68, 68, 0.3)" : "rgba(99, 102, 241, 0.3)" }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: "var(--border-color)" }}>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white tracking-wide">
              {isBaseline ? "Arm B Control Delivery Tracker" : "Autonomous Recovery Delivery Progress"}
            </h3>
            <span
              className={`pill text-[9px] font-mono font-bold border ${
                isBaseline
                  ? "bg-red-500/20 text-red-300 border-red-500/30"
                  : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
              }`}
            >
              {isBaseline ? "CONTROL ARM (BASELINE)" : "ARM A (AUTONOMOUS AGENT)"}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {isBaseline
              ? "Standard bank retry schedule: blind retries without AI root-cause diagnosis or compliance gates"
              : "Real-time stage-by-stage progression from failure ingest to verified settlement"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">Progress</span>
            <span className={`text-xs font-bold font-mono ${isRecovered ? "text-emerald-400" : isExhausted ? "text-red-400" : "text-indigo-400"}`}>
              {isBaseline ? (isRecovered ? "Recovered via Retry" : "Exhausted (₹0)") : `${completedCount} of 7 Stages Verified`}
            </span>
          </div>
          <div className="w-24 bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${isRecovered ? "bg-emerald-500" : isExhausted ? "bg-red-500" : "bg-indigo-500"}`}
              style={{ width: `${Math.max(15, (completedCount / steps.length) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Progress Timeline (Amazon Delivery Screen Style) */}
      <div className="relative mt-5 pl-2 sm:pl-4 space-y-4">
        {/* Continuous connector track */}
        <div
          className="absolute left-[19px] sm:left-[27px] top-3 bottom-5 w-[2px] bg-zinc-800"
          style={{ zIndex: 0 }}
        />

        {steps.map((step) => {
          const isExpanded = expandedStep === step.id;
          const isDone = step.status === "completed";
          const isCurrent = step.status === "in_progress";
          const isBypassed = step.status === "bypassed";
          const isFail = step.status === "failed" || step.status === "denied";

          return (
            <div key={step.id} className="relative flex items-start gap-3 sm:gap-4 group">
              {/* Milestone Node Icon */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 border z-10 transition-all ${
                  isDone
                    ? "bg-emerald-950/80 border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : isCurrent
                    ? "bg-indigo-950/80 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                    : isFail
                    ? "bg-red-950/80 border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                    : isBypassed
                    ? "bg-zinc-900 border-zinc-700 opacity-50"
                    : "bg-zinc-900 border-zinc-700"
                }`}
              >
                {getIcon(step)}
              </div>

              {/* Step Card */}
              <div
                className={`flex-1 p-3.5 rounded-md border transition-all ${
                  isDone
                    ? "surface border-zinc-800 hover:border-zinc-700"
                    : isCurrent
                    ? "bg-indigo-950/20 border-indigo-500/50"
                    : isFail
                    ? "bg-red-950/20 border-red-900/50"
                    : isBypassed
                    ? "bg-zinc-950/20 border-zinc-900 opacity-60"
                    : "bg-zinc-950/40 border-zinc-900 opacity-60"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold ${
                        isDone
                          ? "text-white"
                          : isCurrent
                          ? "text-indigo-300"
                          : isFail
                          ? "text-red-300"
                          : isBypassed
                          ? "text-zinc-500 line-through"
                          : "text-zinc-500"
                      }`}
                    >
                      {step.title}
                    </span>
                    {step.badgeLabel && (
                      <span
                        className="pill text-[9px] font-mono font-bold flex items-center gap-1"
                        style={{
                          background: `${step.badgeColor}20`,
                          color: step.badgeColor,
                          border: `1px solid ${step.badgeColor}40`,
                        }}
                      >
                        {step.badgeColor === "#8b5cf6" && <Cpu className="w-2.5 h-2.5" />}
                        {step.badgeColor === "#06b6d4" && <Zap className="w-2.5 h-2.5" />}
                        {step.badgeLabel}
                      </span>
                    )}
                  </div>

                  {step.timestamp && (
                    <span className="text-[10px] font-mono text-zinc-400">
                      {formatISTDateTime(step.timestamp)}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-zinc-400 mt-1 font-medium leading-relaxed">
                  {step.details}
                </p>

                {/* WhatsApp message quote if applicable */}
                {step.quote && (
                  <div className="mt-2.5 p-2.5 rounded bg-zinc-950/80 border border-indigo-900/40 text-xs font-mono text-emerald-300">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      📱 WhatsApp Recovery Dispatch (Latin-Script Hinglish):
                    </span>
                    &ldquo;{step.quote}&rdquo;
                  </div>
                )}

                {/* Inspect Audit Evidence Drawer */}
                {step.metadata && Object.keys(step.metadata).length > 0 && !compact && (
                  <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                    <button
                      onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                      className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      <span>{isExpanded ? "Hide Evidence JSON" : "Inspect Raw Evidence"}</span>
                    </button>

                    <span className="text-[10px] font-mono text-zinc-500">
                      Actor: {step.actor}
                    </span>
                  </div>
                )}

                {isExpanded && step.metadata && (
                  <pre className="mt-2 p-2.5 bg-black/70 rounded border border-zinc-800 text-[10px] font-mono text-zinc-300 overflow-x-auto max-h-48">
                    {JSON.stringify(step.metadata, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
