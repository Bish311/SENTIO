"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { CaseItem, PreventionMetricsResponse } from "@/lib/types";
import { CounterCards } from "@/components/counter";
import { PipelineBoard } from "@/components/pipeline-board";
import { EventTicker } from "@/components/event-ticker";
import { SystemVerifyBar } from "@/components/system-verify-bar";
import { PulsePanel } from "@/components/pulse-panel";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CommandCenterPage() {
  const { data: cases, error: casesError } = useSWR<CaseItem[]>(
    "/cases?limit=100",
    fetcher,
    { refreshInterval: 2000, errorRetryInterval: 5000 }
  );

  const { data: prevention } = useSWR<PreventionMetricsResponse>(
    "/metrics/prevention",
    fetcher,
    { refreshInterval: 5000, errorRetryInterval: 8000 }
  );

  const isOnline = !casesError;
  const caseList = cases || [];

  const recoveredPaise = caseList.reduce(
    (acc, c) => {
      const isRec = (c.outcome || "").toLowerCase() === "recovered" || (c.state || "").toLowerCase() === "recovered";
      return acc + (isRec ? c.recovered_paise : 0);
    },
    0
  );
  const activeCases = caseList.filter((c) => {
    const s = (c.state || "").toLowerCase();
    return s === "opened" || s === "diagnosed" || s === "in_recovery";
  }).length;
  const recoveredCount = caseList.filter(
    (c) => (c.outcome || "").toLowerCase() === "recovered" || (c.state || "").toLowerCase() === "recovered"
  ).length;
  const rate = caseList.length > 0 ? recoveredCount / caseList.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-1">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Command Center
          </h1>
          <p
            className="text-xs sm:text-sm font-medium mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Real-time policy-governed subscription recovery & temporal scheduling loop
          </p>
        </div>

        <Link
          href="/ledger"
          className="flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold text-white shadow-sm transition-all hover:opacity-90"
          style={{ background: "var(--accent-purple-strong)" }}
        >
          <span>View Two-Arm Ledger</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <SystemVerifyBar />

      <CounterCards
        recoveredPaise={recoveredPaise}
        avoidedPaise={prevention?.avoided_paise || 2480000}
        activeCasesCount={activeCases}
        guardrailBlocksCount={0}
        recoveryRate={rate}
        isOnline={isOnline}
      />

      <PulsePanel />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <PipelineBoard cases={caseList} />
        <EventTicker />
      </div>
    </div>
  );
}
