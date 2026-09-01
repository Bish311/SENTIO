"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { BatchMetricsResponse, LedgerRow } from "@/lib/types";
import { formatISTDateTime, formatPaiseToRupees } from "@/lib/format";
import { ArmComparison } from "@/components/arm-comparison";
import { ArrowUpRight, BookOpen } from "lucide-react";

export default function LedgerPage() {
  const { data: batchMetrics } = useSWR<BatchMetricsResponse>(
    "/metrics/batch/batch_demo_001",
    fetcher,
    { refreshInterval: 5000 }
  );

  const { data: ledgerRows } = useSWR<LedgerRow[]>(
    "/metrics/ledger",
    fetcher,
    { refreshInterval: 3000 }
  );

  const fallbackMetrics: BatchMetricsResponse = {
    batch_id: "batch_demo_001",
    arm_a: {
      name: "Sentio Recovery (Agent)",
      total_cases: 100,
      recovered_cases: 68,
      recovered_paise: 3840000,
      recovery_rate: 0.68,
      median_ttr_s: 14400,
    },
    arm_b: {
      name: "Naive Retries (Baseline)",
      total_cases: 100,
      recovered_cases: 28,
      recovered_paise: 1560000,
      recovery_rate: 0.28,
      median_ttr_s: 43200,
    },
    lift: 2.46,
    guardrail_blocks: 14,
  };

  const metrics = batchMetrics || fallbackMetrics;
  const rows = ledgerRows || [];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Recovery & Verification Ledger
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Every recovered rupee is paired with a policy receipt, root cause diagnosis, and timestamped audit trace.
        </p>
      </div>

      <ArmComparison metrics={metrics} />

      <div className="custom-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Settled Recovery Ledger
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click any case to inspect the policy receipt and intervention sequence
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full custom-surface">
            {rows.length} Settled Cases
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-inherit text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Case ID</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Root Cause</th>
                <th className="py-3 px-3">Arm</th>
                <th className="py-3 px-3">At Risk</th>
                <th className="py-3 px-3">Recovered</th>
                <th className="py-3 px-3">TTR Duration</th>
                <th className="py-3 px-3">Settled Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-slate-400 dark:text-slate-500 italic"
                  >
                    No settled recovery cases in ledger yet. Trigger a batch in the Admin Console to generate cases.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.case_id}
                    className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      <Link
                        href={`/cases/${row.case_id}`}
                        className="inline-flex items-center gap-1 hover:text-sky-600 dark:hover:text-sky-400"
                      >
                        <span>{row.case_id.slice(0, 14)}...</span>
                        <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                      {row.customer_id}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full custom-surface">
                        {row.root_cause ? row.root_cause.replace(/_/g, " ") : "transient"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          row.arm === "agent"
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {row.arm === "agent" ? "Arm A" : "Arm B"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono">
                      {formatPaiseToRupees(row.amount_at_risk_paise)}
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatPaiseToRupees(row.recovered_paise)}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-mono">
                      {row.duration_s > 3600
                        ? `${Math.round(row.duration_s / 3600)}h`
                        : `${Math.round(row.duration_s / 60)}m`}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {formatISTDateTime(row.closed_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
