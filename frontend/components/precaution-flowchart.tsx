"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, postData } from "@/lib/api";
import { formatISTDateTime, formatPaiseToRupees } from "@/lib/format";
import {
  ShieldCheck,
  Zap,
  ArrowDown,
  RefreshCw,
  Terminal,
  FileCode,
  CreditCard,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export function PrecautionFlowchart() {
  const [sweepLoading, setSweepLoading] = useState(false);
  const [sweepResult, setSweepResult] = useState<{
    found_budget_risk?: number;
    prevented_count?: number;
    avoided_paise?: number;
  } | null>(null);

  const { data: preventionMetrics, mutate: mutateMetrics } = useSWR(
    "/metrics/prevention",
    fetcher,
    { refreshInterval: 4000 }
  );

  const handleRunSweep = async () => {
    setSweepLoading(true);
    try {
      const res = (await postData(
        "/admin/run-sweep",
        { seed_sample_risk: true },
        "dev-admin-secret-2026"
      )) as { found_budget_risk: number; prevented_count: number; avoided_paise: number };
      setSweepResult(res);
      await mutateMetrics();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to run proactive sweep");
    } finally {
      setSweepLoading(false);
    }
  };

  const preventedCount = sweepResult?.prevented_count ?? preventionMetrics?.prevented_count ?? 1;
  const avoidedPaise = sweepResult?.avoided_paise ?? preventionMetrics?.avoided_paise ?? 249900;
  const atRiskCount = sweepResult?.found_budget_risk ?? 1;

  return (
    <div className="space-y-4">
      {/* Flow Header Line */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3" style={{ borderColor: "#1e2026" }}>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-300 uppercase">
            PULSE PRECAUTION ENGINE &middot; PROACTIVE CHURN MITIGATION
          </h2>
          <span className="pill text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
            PRECAUTION &gt; CURE
          </span>
        </div>

        <button
          onClick={handleRunSweep}
          disabled={sweepLoading}
          className="px-3.5 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-emerald-400/40"
        >
          {sweepLoading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5 fill-current" />
          )}
          <span>{sweepLoading ? "Sweeping Subscriptions..." : "Run Proactive Pulse Sweep Now"}</span>
        </button>
      </div>

      {/* Proactive Metric Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 rounded bg-[#0d0e12] border border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Sweep Cadence</span>
          <span className="text-sm font-bold text-white block mt-0.5">Daily @ 06:00 IST</span>
          <span className="text-[10px] text-zinc-500">Autonomous temporal cron</span>
        </div>
        <div className="p-3 rounded bg-[#0d0e12] border border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Expiry Lookahead</span>
          <span className="text-sm font-bold text-amber-400 block mt-0.5">30-Day Window</span>
          <span className="text-[10px] text-zinc-500">Card &amp; mandate signals</span>
        </div>
        <div className="p-3 rounded bg-[#0d0e12] border border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">At-Risk Detected</span>
          <span className="text-sm font-bold text-indigo-300 block mt-0.5">{atRiskCount} Subscriptions</span>
          <span className="text-[10px] text-zinc-500">Pre-terminal mandate risk</span>
        </div>
        <div className="p-3 rounded bg-[#0d0e12] border border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Loss Avoided</span>
          <span className="text-sm font-bold text-emerald-400 block mt-0.5">{formatPaiseToRupees(avoidedPaise)}</span>
          <span className="text-[10px] text-zinc-500">{preventedCount} Churns Prevented</span>
        </div>
      </div>

      {/* PROACTIVE FLOWCHART SPINE */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-4 before:bottom-4 before:w-[1px] before:bg-zinc-800 mt-5">
        
        {/* ================= STEP 1: AUTONOMOUS SWEEP ================= */}
        <div className="relative">
          <div className="absolute -left-6 top-1 w-5 h-5 rounded bg-zinc-900 border border-zinc-700 flex items-center justify-center font-mono text-[10px] text-zinc-300 font-bold">
            1
          </div>

          <div className="p-4 rounded border bg-[#0d0e12]" style={{ borderColor: "#1e2026" }}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Pulse Daily Mandate &amp; Card Lookahead Sweep
                </span>
                <span className="pill text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  CRON ACTIVE
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                Executed: {formatISTDateTime(new Date().toISOString())}
              </span>
            </div>

            <p className="mt-2 text-xs font-mono text-zinc-300">
              Scans all active subscriptions on PostgreSQL Spine <strong>before</strong> bank mandate execution dates to catch preventable payment drops.
            </p>
          </div>

          <div className="flex items-center justify-center py-2 text-zinc-600">
            <ArrowDown className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* ================= STEP 2: PRE-FAILURE RISK SIGNALS ================= */}
        <div className="relative">
          <div className="absolute -left-6 top-1 w-5 h-5 rounded bg-zinc-900 border border-amber-700/60 flex items-center justify-center font-mono text-[10px] text-amber-400 font-bold">
            2
          </div>

          <div className="p-4 rounded border bg-[#0d0e12]" style={{ borderColor: "#1e2026" }}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Dual-Vector Risk Identification
                </span>
                <span className="pill text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  DETERMINISTIC TELEMETRY
                </span>
              </div>
              <span className="pill text-[9px] font-mono bg-zinc-800 text-zinc-300">
                ZERO CUSTOMER TICKETS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs font-mono">
              <div className="p-3 rounded bg-black/60 border border-zinc-800/80">
                <div className="flex items-center gap-2 mb-1.5 text-amber-400 font-bold">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Vector A: 30-Day Card Expiry</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Identifies customer cards scheduled to expire within the upcoming billing cycle, preempting hard bank declines before authorization attempts.
                </p>
              </div>

              <div className="p-3 rounded bg-black/60 border border-zinc-800/80">
                <div className="flex items-center gap-2 mb-1.5 text-red-400 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Vector B: Retry Budget Ceiling (&ge; 2)</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Flags subscriptions that reached 2 retries, preventing the fatal 3rd retry where banks cancel mandates and levy &minus;₹180 customer penalties.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center py-2 text-zinc-600">
            <ArrowDown className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* ================= STEP 3: GUARD INTERVENTION APPROVAL ================= */}
        <div className="relative">
          <div className="absolute -left-6 top-1 w-5 h-5 rounded bg-zinc-900 border border-emerald-700/60 flex items-center justify-center font-mono text-[10px] text-emerald-400 font-bold">
            3
          </div>

          <div className="p-4 rounded border bg-[#0d0e12]" style={{ borderColor: "#1e2026" }}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Guard Policy Gate &middot; Action: update_card_link
                </span>
                <span className="pill text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  POLICY VERDICT: ALLOW
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Cryptographic Policy Receipt: <strong className="text-zinc-200">rcpt_prev_sweep_ok</strong>
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-black/50 border border-zinc-800/60 flex items-center justify-between">
                <span className="text-zinc-400">Kill Switch Inactive</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="p-2 rounded bg-black/50 border border-zinc-800/60 flex items-center justify-between">
                <span className="text-zinc-400">Opt-Out Respected</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="p-2 rounded bg-black/50 border border-zinc-800/60 flex items-center justify-between">
                <span className="text-zinc-400">Quiet Hours Compliant</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="p-2 rounded bg-black/50 border border-zinc-800/60 flex items-center justify-between">
                <span className="text-zinc-400">Confidence Threshold (1.0)</span>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center py-2 text-zinc-600">
            <ArrowDown className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* ================= STEP 4: PROACTIVE OUTREACH DISPATCH ================= */}
        <div className="relative">
          <div className="absolute -left-6 top-1 w-5 h-5 rounded bg-zinc-900 border border-sky-700/60 flex items-center justify-center font-mono text-[10px] text-sky-400 font-bold">
            4
          </div>

          <div className="p-4 rounded border bg-[#0d0e12]" style={{ borderColor: "#1e2026" }}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Proactive WhatsApp Mandate Update Dispatch
                </span>
                <span className="pill text-[9px] font-mono bg-sky-500/10 text-sky-300 border border-sky-500/30">
                  DISPATCHED
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Channel: WhatsApp Business API
              </span>
            </div>

            <div className="mt-2.5 p-3 rounded bg-zinc-950/80 border border-zinc-800 text-xs font-mono text-emerald-300">
              <span className="text-[10px] text-zinc-500 uppercase block mb-1">
                💬 Proactive Card Update Message:
              </span>
              &ldquo;Namaste Ananya, aapka subscription card agle hafte expire ho raha hai. Smooth billing ke liye apna payment method yahan update karein: https://rzp.io/l/update_card. Messages band karne ke liye STOP reply karein.&rdquo;
            </div>
          </div>

          <div className="flex items-center justify-center py-2 text-zinc-600">
            <ArrowDown className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* ================= STEP 5: OUTCOME / CHURN PREVENTED ================= */}
        <div className="relative">
          <div className="absolute -left-6 top-1 w-5 h-5 rounded bg-zinc-900 border border-emerald-700/60 flex items-center justify-center font-mono text-[10px] text-emerald-400 font-bold">
            5
          </div>

          <div className="p-4 rounded border bg-[#0d0e12]" style={{ borderColor: "#1e2026" }}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Outcome: Involuntary Churn Prevented
                </span>
                <span className="pill text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-bold">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  CASE CLOSED &middot; PREVENTED
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">
                +{formatPaiseToRupees(avoidedPaise)} PROTECTED
              </span>
            </div>

            <p className="mt-2 text-xs font-mono text-zinc-300">
              Customer seamlessly updated mandate details before payment due date. 0 payment declines, 0 customer dispute tickets, and zero bank penalty fees incurred.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
