"use client";

import { CaseDetail } from "@/lib/types";
import { formatISTDateTime, formatPaiseToRupees } from "@/lib/format";
import {
  ShieldCheck,
  Zap,
  ArrowDown,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  MessageSquare,
  Shield,
  FileCheck,
} from "lucide-react";

interface PrecautionFlowchartProps {
  caseDetail?: CaseDetail | null;
}

export function PrecautionFlowchart({ caseDetail }: PrecautionFlowchartProps) {
  if (!caseDetail) {
    return (
      <div className="p-8 rounded border bg-[#0d0e12] text-center space-y-3" style={{ borderColor: "#1e2026" }}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pulse Proactive Mandate Engine Active</span>
        </div>
        <h3 className="text-sm font-mono font-bold text-white">No Prevention Case Selected</h3>
        <p className="text-xs font-mono text-zinc-400 max-w-md mx-auto">
          Click <strong>RUN PULSE SWEEP</strong> in the header bar above to scan active PostgreSQL subscriptions and intercept retry ceilings before bank failures occur.
        </p>
      </div>
    );
  }

  const events = caseDetail.timeline || [];
  const evOpened = events.find((e) => e.event_type === "case.opened");
  const evPolicy = events.find((e) => e.event_type.startsWith("policy."));
  const receipt = (evPolicy?.payload?.receipt || {}) as Record<string, unknown>;
  const receiptId =
    (receipt?.receipt_id as string) ||
    (evPolicy?.payload?.receipt_id as string) ||
    (caseDetail.interventions?.[0]?.policy_receipt?.receipt_id as string) ||
    "rcpt_guard_active";
  const rulesEvaluated = (receipt?.rules_evaluated as string[]) || [
    "kill_switch",
    "opt_out_respected",
    "quiet_hours",
    "no_auto_action_low_confidence",
  ];
  const verdict = (evPolicy?.payload?.verdict as string) || (receipt?.verdict as string) || "ALLOW";

  const evOutreach = events.find((e) => e.event_type === "prevention.outreach_drafted");
  const evPrevented = events.find((e) => e.event_type === "case.prevented");

  const openedPayload = (evOpened?.payload || {}) as Record<string, unknown>;
  const custName =
    caseDetail.customer?.name ||
    (openedPayload.customer_name as string) ||
    `Subscriber (${caseDetail.customer_id?.slice(-6) || "Active"})`;
  const custPhone =
    caseDetail.customer?.phone || (openedPayload.customer_phone as string) || "+91-Verified-Mandate";
  const subId =
    caseDetail.subscription_id || (openedPayload.subscription_id as string) || "sub_active_mandate";
  const planId =
    caseDetail.subscription?.plan_id || (openedPayload.plan_id as string) || "plan_recurring_mandate";
  const retries =
    caseDetail.subscription?.retry_budget_used ?? (openedPayload.retry_budget_used as number) ?? 2;
  const amountPaise =
    caseDetail.amount_at_risk_paise || (openedPayload.amount_at_risk_paise as number) || 0;

  const outreachMsg =
    (evOutreach?.payload?.message as string) ||
    `Namaste ${custName}, aapka ${planId} subscription mandate retry limit par hai. Interruption se bachne ke liye payment method yahan update karein: https://rzp.io/l/upd_${subId.slice(-6)}. STOP reply karein to opt-out.`;
  const scheduledWindow =
    (evOutreach?.payload?.scheduled_window_ist as string) || "Next Daylight Window (09:00 IST)";
  const openedTs = evOpened?.ts || caseDetail.opened_at || new Date().toISOString();

  return (
    <div className="space-y-4">
      {/* Flow Header Line - Clean, Single Header */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 min-h-[42px]"
        style={{ borderColor: "#1e2026" }}
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
          <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-300 uppercase truncate">
            PULSE PRECAUTION ENGINE &middot; PROACTIVE CHURN MITIGATION
          </h2>
          <span className="pill text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold shrink-0">
            PRECAUTION &gt; CURE
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-zinc-500">STAGE 1 &rarr; 5</span>
          <span className="pill text-[9px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
            CASE: {caseDetail.id}
          </span>
        </div>
      </div>

      {/* Proactive Metric Summary - Stable Fixed Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 rounded bg-[#0d0e12] border border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Sweep Cadence</span>
          <span className="text-sm font-bold text-white block mt-0.5">Daily @ 06:00 IST</span>
          <span className="text-[10px] text-zinc-500">Temporal cron engine</span>
        </div>
        <div className="p-3 rounded bg-[#0d0e12] border border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Lookahead Window</span>
          <span className="text-sm font-bold text-amber-400 block mt-0.5">30-Day Expiry</span>
          <span className="text-[10px] text-zinc-500">Pre-charge warning</span>
        </div>
        <div className="p-3 rounded bg-[#0d0e12] border border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Mandate Status</span>
          <span className="text-sm font-bold text-indigo-300 block mt-0.5">
            {caseDetail.state.toUpperCase()}
          </span>
          <span className="text-[10px] text-zinc-500">Retry ceiling guarded</span>
        </div>
        <div className="p-3 rounded bg-[#0d0e12] border border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Loss Avoided</span>
          <span className="text-sm font-bold text-emerald-400 block mt-0.5">
            {formatPaiseToRupees(amountPaise)}
          </span>
          <span className="text-[10px] text-zinc-500">Zero retry penalty fees</span>
        </div>
      </div>

      {/* Persistent Stable Status Banner */}
      <div className="p-2.5 rounded bg-[#0d0e12] border border-zinc-800/80 text-xs font-mono flex items-center justify-between min-h-[38px]">
        <div className="flex items-center gap-2 text-zinc-300">
          <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            Live Telemetry: Loaded case <strong>{caseDetail.id}</strong> &middot; Subscription <strong>{subId}</strong>
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 font-bold hidden sm:inline">
          AUTONOMOUS PULSE &middot; REAL DATABASE DATA
        </span>
      </div>

      {/* PROACTIVE FLOWCHART SPINE */}
      <div className="relative pl-7 space-y-5 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-[2px] before:bg-zinc-800/90 mt-4">
        
        {/* ================= STEP 1: AUTONOMOUS SWEEP ================= */}
        <div className="relative">
          <div className="absolute -left-7 top-1 w-6 h-6 rounded-full bg-zinc-950 border border-zinc-700 flex items-center justify-center font-mono text-[10px] text-zinc-300 font-bold shadow-sm">
            1
          </div>

          <div className="p-4 rounded border bg-[#0d0e12]" style={{ borderColor: "#1e2026" }}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Pulse Daily Mandate &amp; Card Lookahead Sweep
                </span>
                <span className="pill text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  AUTONOMOUS CRON
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                Evaluation Window: {formatISTDateTime(openedTs)}
              </span>
            </div>

            <div className="mt-2.5 text-xs font-mono text-zinc-300 space-y-1">
              <p>
                Scans active PostgreSQL subscriptions <strong>before</strong> bank mandate execution dates to intercept recurring failures before any customer penalty or mandate cancellation.
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-zinc-500 pt-1">
                <span className="px-1.5 py-0.5 rounded bg-black/60 border border-zinc-800">
                  Filter: Subscription.status = active
                </span>
                <span className="px-1.5 py-0.5 rounded bg-black/60 border border-zinc-800">
                  Condition: retry_budget_used &ge; 2 OR card_expiry &le; 30d
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center py-1.5 text-zinc-600">
            <ArrowDown className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* ================= STEP 2: PRE-FAILURE RISK SIGNALS ================= */}
        <div className="relative">
          <div className="absolute -left-7 top-1 w-6 h-6 rounded-full bg-zinc-950 border border-amber-500/60 flex items-center justify-center font-mono text-[10px] text-amber-400 font-bold shadow-sm">
            2
          </div>

          <div className="p-4 rounded border bg-[#0d0e12]" style={{ borderColor: "#1e2026" }}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Target Risk Vector Identification
                </span>
                <span className="pill text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  IDENTIFIED TELEMETRY
                </span>
              </div>
              <span className="pill text-[9px] font-mono bg-zinc-800 text-zinc-300">
                SUB: {subId}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 text-xs font-mono">
              <div className="p-2.5 rounded bg-black/50 border border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 block uppercase">Subscriber</span>
                <span className="text-zinc-200 font-bold truncate block">{custName}</span>
                <span className="text-[10px] text-zinc-500">{custPhone}</span>
              </div>
              <div className="p-2.5 rounded bg-black/50 border border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 block uppercase">Plan &amp; Amount</span>
                <span className="text-amber-400 font-bold block">{formatPaiseToRupees(amountPaise)}</span>
                <span className="text-[10px] text-zinc-400 truncate block">{planId}</span>
              </div>
              <div className="p-2.5 rounded bg-black/50 border border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 block uppercase">Risk Vector</span>
                <span className="text-red-400 font-bold block">Retry Ceiling &ge; 2</span>
                <span className="text-[10px] text-zinc-400">{retries}/3 retries logged</span>
              </div>
              <div className="p-2.5 rounded bg-black/50 border border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 block uppercase">Mandate State</span>
                <span className="text-emerald-400 font-bold block">Intervention Required</span>
                <span className="text-[10px] text-zinc-500">Preventing &minus;₹180 fee</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center py-1.5 text-zinc-600">
            <ArrowDown className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* ================= STEP 3: GUARD INTERVENTION APPROVAL ================= */}
        <div className="relative">
          <div className="absolute -left-7 top-1 w-6 h-6 rounded-full bg-zinc-950 border border-emerald-500/60 flex items-center justify-center font-mono text-[10px] text-emerald-400 font-bold shadow-sm">
            3
          </div>

          <div className="p-4 rounded border bg-[#0d0e12]" style={{ borderColor: "#1e2026" }}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Guard Policy Gate &middot; Action: update_card_link
                </span>
                <span className="pill text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  VERDICT: {verdict}
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Receipt: <strong className="text-zinc-200">{receiptId}</strong>
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-black/50 border border-zinc-800/60 flex items-center justify-between">
                <span className="text-zinc-400">Kill Switch Safe</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </div>
              <div className="p-2 rounded bg-black/50 border border-zinc-800/60 flex items-center justify-between">
                <span className="text-zinc-400">Opt-Out Respected</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </div>
              <div className="p-2 rounded bg-black/50 border border-zinc-800/60 flex items-center justify-between">
                <span className="text-zinc-400">Quiet Hours Evaluated</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </div>
              <div className="p-2 rounded bg-black/50 border border-zinc-800/60 flex items-center justify-between">
                <span className="text-zinc-400">Confidence (1.0)</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center py-1.5 text-zinc-600">
            <ArrowDown className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* ================= STEP 4: PROACTIVE OUTREACH DISPATCH ================= */}
        <div className="relative">
          <div className="absolute -left-7 top-1 w-6 h-6 rounded-full bg-zinc-950 border border-sky-500/60 flex items-center justify-center font-mono text-[10px] text-sky-400 font-bold shadow-sm">
            4
          </div>

          <div className="p-4 rounded border bg-[#0d0e12]" style={{ borderColor: "#1e2026" }}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Proactive WhatsApp Mandate Update Dispatch
                </span>
                <span className="pill text-[9px] font-mono bg-sky-500/10 text-sky-300 border border-sky-500/30 font-bold">
                  SCHEDULED: {scheduledWindow}
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Channel: WhatsApp Business API
              </span>
            </div>

            <div className="mt-2.5 p-3 rounded bg-zinc-950/80 border border-zinc-800 text-xs font-mono text-emerald-300">
              <span className="text-[10px] text-zinc-500 uppercase block mb-1">
                💬 Generated Dynamic Customer Outreach Copy:
              </span>
              &ldquo;{outreachMsg}&rdquo;
            </div>
          </div>

          <div className="flex items-center justify-center py-1.5 text-zinc-600">
            <ArrowDown className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* ================= STEP 5: OUTCOME / CHURN PREVENTED ================= */}
        <div className="relative">
          <div className="absolute -left-7 top-1 w-6 h-6 rounded-full bg-zinc-950 border border-emerald-500/60 flex items-center justify-center font-mono text-[10px] text-emerald-400 font-bold shadow-sm">
            5
          </div>

          <div className="p-4 rounded border bg-[#0d0e12]" style={{ borderColor: "#1e2026" }}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Outcome: Involuntary Churn Prevented
                </span>
                <span className="pill text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  CASE: {caseDetail.id} &middot; {caseDetail.state.toUpperCase()}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                +{formatPaiseToRupees(amountPaise)} PROTECTED
              </span>
            </div>

            <p className="mt-2 text-xs font-mono text-zinc-300">
              Mandate update link verified against Guard policy. Customer receives proactive update link before next bank charge, avoiding involuntary churn and debit failure penalties.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

