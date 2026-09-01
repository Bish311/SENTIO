"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { CaseItem, DenialItem, PreventionMetricsResponse } from "@/lib/types";
import { CounterCards } from "@/components/counter";
import { PipelineBoard } from "@/components/pipeline-board";
import { EventTicker } from "@/components/event-ticker";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";

export default function CommandCenterPage() {
  const { data: cases, mutate: mutateCases } = useSWR<CaseItem[]>(
    "/cases?limit=100",
    fetcher,
    { refreshInterval: 2000 }
  );

  const { data: prevention } = useSWR<PreventionMetricsResponse>(
    "/metrics/prevention",
    fetcher,
    { refreshInterval: 3000 }
  );

  const { data: denials } = useSWR<DenialItem[]>(
    "/admin/policy-denials",
    fetcher,
    { refreshInterval: 3000 }
  );

  const caseList = cases || [];
  const recoveredPaise = caseList.reduce(
    (acc, curr) => acc + (curr.outcome === "recovered" ? curr.recovered_paise : 0),
    0
  );
  const activeCasesCount = caseList.filter(
    (c) => c.state === "opened" || c.state === "diagnosed" || c.state === "in_recovery"
  ).length;
  const recoveredCount = caseList.filter((c) => c.outcome === "recovered").length;
  const recoveryRate = caseList.length > 0 ? recoveredCount / caseList.length : 0;
  const avoidedPaise = prevention?.avoided_paise || 0;
  const guardrailBlocksCount = denials?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Command Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time policy-governed subscription recovery & temporal scheduling loop
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => mutateCases()}
            aria-label="Refresh dashboard"
            className="p-2 rounded-xl custom-surface hover:opacity-90 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/ledger"
            className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-sm"
          >
            <span>View Two-Arm Ledger</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <CounterCards
        recoveredPaise={recoveredPaise}
        avoidedPaise={avoidedPaise}
        activeCasesCount={activeCasesCount}
        guardrailBlocksCount={guardrailBlocksCount}
        recoveryRate={recoveryRate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PipelineBoard cases={caseList} />
        </div>
        <div>
          <EventTicker />
        </div>
      </div>
    </div>
  );
}
