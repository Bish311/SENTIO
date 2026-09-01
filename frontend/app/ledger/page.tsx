"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { BatchMetricsResponse, LedgerRow } from "@/lib/types";
import { formatISTDateTime, formatPaiseToRupees } from "@/lib/format";
import { ArmComparison } from "@/components/arm-comparison";
import { ArrowUpRight } from "lucide-react";

export default function LedgerPage() {
  const { data: batchMetrics } = useSWR<BatchMetricsResponse>(
    "/metrics/batch/batch_demo_001",
    fetcher,
    { refreshInterval: 5000, errorRetryInterval: 8000 }
  );

  const { data: ledgerRows } = useSWR<LedgerRow[]>(
    "/metrics/ledger",
    fetcher,
    { refreshInterval: 5000, errorRetryInterval: 8000 }
  );

  const fallback: BatchMetricsResponse = {
    batch_id: "batch_demo_001",
    arm_a: { name: "Sentio (Agent)", total_cases: 100, recovered_cases: 68, recovered_paise: 3840000, recovery_rate: 0.68, median_ttr_s: 14400 },
    arm_b: { name: "Baseline", total_cases: 100, recovered_cases: 28, recovered_paise: 1560000, recovery_rate: 0.28, median_ttr_s: 43200 },
    lift: 2.46,
    guardrail_blocks: 14,
  };

  const metrics = batchMetrics || fallback;
  const rows = ledgerRows || [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Recovery & Verification Ledger
        </h1>
        <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>
          Every recovered rupee is paired with a policy receipt, root cause diagnosis, and timestamped audit trace.
        </p>
      </div>

      <ArmComparison metrics={metrics} />

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              Settled Recovery Records
            </h2>
          </div>
          {rows.length > 0 && (
            <span className="pill text-[10px]" style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}>
              {rows.length} Settled Cases
            </span>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="surface p-5 text-center text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            No settled cases yet. Head to Admin to run a 20-case simulation batch.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10" style={{ background: "var(--bg-card)" }}>
                <tr className="border-b" style={{ borderColor: "var(--border-color)" }}>
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Case ID</th>
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Customer</th>
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Root Cause</th>
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Arm</th>
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: "var(--text-muted)" }}>At Risk</th>
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: "#10b981" }}>Recovered</th>
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: "var(--text-muted)" }}>TTR</th>
                  <th className="pb-2 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: "var(--text-muted)" }}>Settled</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                {rows.map((row) => (
                  <tr key={row.case_id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                    <td className="py-2 pr-2 font-mono font-bold text-xs">
                      <Link
                        href={`/cases/${row.case_id}`}
                        className="inline-flex items-center gap-1 hover:underline"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {row.case_id.slice(0, 14)}...
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>
                    <td className="py-2 text-xs font-mono font-medium" style={{ color: "var(--text-secondary)" }}>
                      {row.customer_id}
                    </td>
                    <td className="py-2">
                      <span className="pill text-[9px]" style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}>
                        {row.root_cause ? row.root_cause.replace(/_/g, " ") : "transient"}
                      </span>
                    </td>
                    <td className="py-2">
                      <span
                        className="pill text-[9px]"
                        style={{
                          background: row.arm === "agent" ? "rgba(16,185,129,0.15)" : "var(--bg-surface)",
                          color: row.arm === "agent" ? "#10b981" : "var(--text-muted)",
                        }}
                      >
                        {row.arm === "agent" ? "Arm A" : "Arm B"}
                      </span>
                    </td>
                    <td className="py-2 text-xs font-mono font-medium text-right" style={{ color: "var(--text-muted)" }}>
                      {formatPaiseToRupees(row.amount_at_risk_paise)}
                    </td>
                    <td className="py-2 text-xs font-mono font-extrabold text-right" style={{ color: "#10b981" }}>
                      {formatPaiseToRupees(row.recovered_paise)}
                    </td>
                    <td className="py-2 text-xs font-mono font-medium text-right" style={{ color: "var(--text-secondary)" }}>
                      {row.duration_s > 3600 ? `${Math.round(row.duration_s / 3600)}h` : `${Math.round(row.duration_s / 60)}m`}
                    </td>
                    <td className="py-2 text-[11px] font-mono font-medium text-right" style={{ color: "var(--text-muted)" }}>
                      {formatISTDateTime(row.closed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
