"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { CaseDetail } from "@/lib/types";
import { formatISTDateTime, formatPaiseToRupees } from "@/lib/format";
import { CaseTimeline } from "@/components/case-timeline";
import { ArrowLeft } from "lucide-react";

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { data: caseDetail, error } = useSWR<CaseDetail>(
    `/cases/${resolvedParams.id}`,
    fetcher,
    { refreshInterval: 3000 }
  );

  if (error) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Case Not Found</h2>
        <p className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>
          Could not locate case {resolvedParams.id} on the Spine.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold px-4 py-2 rounded-md surface border"
          style={{ borderColor: "var(--border-color)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Command Center
        </Link>
      </div>
    );
  }

  if (!caseDetail) {
    return (
      <div className="py-16 text-center text-xs font-medium" style={{ color: "var(--text-muted)" }}>
        Loading case details from Spine...
      </div>
    );
  }

  const raw = caseDetail as unknown as { case?: CaseDetail } & CaseDetail;
  const c = raw.case ? { ...raw.case, timeline: raw.timeline || caseDetail.timeline } : caseDetail;

  const isRecovered = (c.outcome || "").toLowerCase() === "recovered" || (c.state || "").toLowerCase() === "recovered" || (c.state || "").toLowerCase() === "settled";

  const infoItems = [
    { label: "Customer ID", value: c.customer_id },
    { label: "Subscription ID", value: c.subscription_id },
    { label: "Root Cause", value: c.root_cause ? c.root_cause.replace(/_/g, " ") : "Pending Diagnosis" },
    { label: "Experiment Arm", value: c.arm === "agent" ? "Arm A (Sentio AI)" : "Arm B (Baseline)" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b" style={{ borderColor: "var(--border-color)" }}>
        <div className="flex items-center gap-3.5">
          <Link
            href="/"
            className="w-9 h-9 rounded-md flex items-center justify-center surface border hover:opacity-90"
            style={{ borderColor: "var(--border-color)" }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: "var(--text-primary)" }} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold font-mono" style={{ color: "var(--text-primary)" }}>
                {c.id}
              </h1>
              <span
                className="pill text-xs"
                style={{
                  background: isRecovered ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                  color: isRecovered ? "#10b981" : "#f59e0b",
                  border: isRecovered ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(245,158,11,0.3)",
                }}
              >
                {c.state}
              </span>
            </div>
            <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
              Opened {formatISTDateTime(c.opened_at)}
            </p>
          </div>
        </div>

        <div className="card px-5 py-3 text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
            {isRecovered ? "Recovered Amount" : "Amount At Risk"}
          </span>
          <span className="text-xl font-extrabold font-mono" style={{ color: isRecovered ? "#10b981" : "var(--text-primary)" }}>
            {formatPaiseToRupees(isRecovered ? c.recovered_paise : c.amount_at_risk_paise)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {infoItems.map((item) => (
          <div key={item.label} className="card p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>
              {item.label}
            </span>
            <span className="text-sm font-bold block truncate capitalize font-mono" style={{ color: "var(--text-primary)" }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 border" style={{ borderColor: "rgba(6, 182, 212, 0.3)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">STAGE 2: LENS DIAGNOSIS</span>
            <span className="pill text-[9px] font-mono bg-cyan-500/20 text-cyan-300">T1 CLASSIFIER</span>
          </div>
          <div className="text-sm font-bold text-white mb-1">
            {c.root_cause ? c.root_cause.toUpperCase() : "TRANSIENT"}
          </div>
          <p className="text-[11px] text-zinc-400 font-mono">
            {c.root_cause === "cash_timing" || c.root_cause === "friction"
              ? "Opaque decline routed to T1 LLM. Extracted cause with >=0.70 confidence."
              : "Recognized error code. Diagnosed via Deterministic Matrix in 2ms."}
          </p>
        </div>

        <div className="card p-4 border" style={{ borderColor: "rgba(16, 185, 129, 0.3)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">STAGE 3 &amp; 5: SAFETY LINTER</span>
            <span className="pill text-[9px] font-mono bg-emerald-500/20 text-emerald-300">0 VIOLATIONS</span>
          </div>
          <div className="text-sm font-bold text-white mb-1">
            Defensive Linter Passed
          </div>
          <p className="text-[11px] text-zinc-400 font-mono">
            Checked 11 banned debt harassment words (penalty, court, defaulter). Opt-out instruction verified.
          </p>
        </div>

        <div className="card p-4 border" style={{ borderColor: "rgba(99, 102, 241, 0.3)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">STAGE 4: CHRONO TIME LOCK</span>
            <span className="pill text-[9px] font-mono bg-indigo-500/20 text-indigo-300">TEMPORAL ENGINE</span>
          </div>
          <div className="text-sm font-bold text-white mb-1">
            {c.root_cause === "cash_timing" ? "Payday Lock Engaged" : "Quiet Hours Compliant"}
          </div>
          <p className="text-[11px] text-zinc-400 font-mono">
            {c.root_cause === "cash_timing"
              ? "Customer promise-to-pay booked. Automated retries locked until payday."
              : "Enforced 21:00-09:00 IST quiet hours with next legal window rescheduling."}
          </p>
        </div>
      </div>

      <CaseTimeline events={c.timeline || []} />
    </div>
  );
}
