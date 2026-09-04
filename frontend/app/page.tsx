"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, postData } from "@/lib/api";
import { CaseDetail, CaseItem } from "@/lib/types";
import { TransactionFlowchart } from "@/components/transaction-flowchart";
import { formatPaiseToRupees } from "@/lib/format";
import Link from "next/link";
import { Play, RefreshCw, Layers, ArrowRight, ExternalLink } from "lucide-react";

export default function CommandCenterPage() {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);

  const { data: cases, mutate: mutateCases } = useSWR<CaseItem[]>(
    "/cases?limit=50",
    fetcher,
    { refreshInterval: 2500, errorRetryInterval: 6000 }
  );

  const caseList = cases || [];

  const recoveredPaise = caseList.reduce(
    (acc, c) => acc + (((c.outcome || "").toLowerCase() === "recovered" || (c.state || "").toLowerCase() === "recovered") ? c.recovered_paise : 0),
    0
  );
  const atRiskPaise = caseList.reduce((acc, c) => acc + (c.amount_at_risk_paise || 0), 0);
  const activeCases = caseList.filter((c) => {
    const s = (c.state || "").toLowerCase();
    return s === "opened" || s === "diagnosed" || s === "in_recovery";
  }).length;
  const recoveredCount = caseList.filter(
    (c) => (c.outcome || "").toLowerCase() === "recovered" || (c.state || "").toLowerCase() === "recovered"
  ).length;
  const rate = caseList.length > 0 ? (recoveredCount / caseList.length) * 100 : 0;

  // Default to the latest active case, or first case
  const defaultCase =
    caseList.find((c) => c.state === "opened" || c.state === "in_recovery" || c.state === "diagnosed") ||
    caseList[0];

  const currentCase = selectedCaseId
    ? caseList.find((c) => c.id === selectedCaseId) || defaultCase
    : defaultCase;

  const { data: currentCaseDetail, mutate: mutateCurrentCase } = useSWR<CaseDetail>(
    currentCase ? `/cases/${currentCase.id}` : null,
    fetcher,
    { refreshInterval: 2000 }
  );

  const handleRunFreshRazorpay = async () => {
    setTriggerLoading(true);
    try {
      const res = await postData(
        "/admin/single-step",
        { opaque: true, scenario_idx: Math.floor(Math.random() * 10) },
        "dev-admin-secret-2026"
      ) as { case_id: string };
      await mutateCases();
      if (res?.case_id) {
        setSelectedCaseId(res.case_id);
        await mutateCurrentCase();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to execute live Razorpay transaction");
    } finally {
      setTriggerLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Bar matching personal/phs */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b" style={{ borderColor: "#1e2026" }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
              PULSERECOVER &middot; SENTIO
            </span>
            <span className="pill text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
              RAZORPAY TEST MODE
            </span>
          </div>
          <h1 className="text-xl font-mono font-extrabold text-white tracking-tight mt-0.5">
            Command Center
          </h1>
          <p className="text-xs font-mono text-zinc-400 mt-0.5">
            Payment reliability &amp; autonomous revenue recovery pipeline &mdash; live from external Razorpay APIs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {caseList.length > 1 && (
            <div className="flex items-center gap-1.5 bg-black/60 border border-zinc-800 rounded px-2 py-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase">Case:</span>
              <select
                value={currentCase?.id || ""}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="bg-transparent text-zinc-200 text-xs font-mono focus:outline-none cursor-pointer"
              >
                {caseList.map((c) => (
                  <option key={c.id} value={c.id} className="bg-zinc-900 text-white">
                    {c.id.slice(0, 18)}... &middot; {formatPaiseToRupees(c.amount_at_risk_paise)} &middot; {(c.root_cause || c.state).toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleRunFreshRazorpay}
            disabled={triggerLoading}
            className="px-3.5 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider text-white bg-amber-600/90 hover:bg-amber-600 active:bg-amber-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 border border-amber-500/40"
          >
            {triggerLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3 h-3 fill-current" />
            )}
            <span>{triggerLoading ? "Invoking Razorpay & 3x LLM..." : "Execute Live Razorpay + 3x LLM"}</span>
          </button>
        </div>
      </div>

      {/* 4 Minimal Metric Tiles matching personal/phs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 rounded bg-[#0d0e12] border border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Recoverable Revenue</span>
          <span className="text-base font-bold text-white block mt-0.5">{formatPaiseToRupees(atRiskPaise)}</span>
          <span className="text-[10px] text-zinc-500">Live test exposure</span>
        </div>
        <div className="p-3 rounded bg-[#0d0e12] border border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Recovered Revenue</span>
          <span className="text-base font-bold text-emerald-400 block mt-0.5">{formatPaiseToRupees(recoveredPaise)}</span>
          <span className="text-[10px] text-zinc-500">Credited to Ledger</span>
        </div>
        <div className="p-3 rounded bg-[#0d0e12] border border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Recovery Rate</span>
          <span className="text-base font-bold text-indigo-300 block mt-0.5">{rate.toFixed(1)}%</span>
          <span className="text-[10px] text-zinc-500">{recoveredCount} of {caseList.length} cases</span>
        </div>
        <div className="p-3 rounded bg-[#0d0e12] border border-zinc-800/80">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Active In Recovery</span>
          <span className="text-base font-bold text-amber-400 block mt-0.5">{activeCases}</span>
          <span className="text-[10px] text-zinc-500">Temporal payday locks</span>
        </div>
      </div>

      {/* Main Flowchart or Empty State */}
      {currentCase && currentCaseDetail ? (
        <div className="p-4 rounded border bg-[#090a0d]" style={{ borderColor: "#1e2026" }}>
          <TransactionFlowchart caseDetail={currentCaseDetail} />
        </div>
      ) : (
        <div className="p-10 rounded border bg-[#0d0e12] text-center space-y-3" style={{ borderColor: "#1e2026" }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Spine Webhook Gateway Ready &middot; Listening for Real Razorpay Events</span>
          </div>
          <h3 className="text-sm font-mono font-bold text-white">Database Cleared &middot; Awaiting Transactions</h3>
          <p className="text-xs font-mono text-zinc-400 max-w-lg mx-auto">
            Ready for live Razorpay webhooks via <code className="text-amber-400">https://gallon-macarena-tycoon.ngrok-free.dev/webhooks/razorpay</code>.
            Click below to instantly trigger a real external Razorpay order and execute 3x live OpenRouter LLM inferences.
          </p>
          <div className="pt-2">
            <button
              onClick={handleRunFreshRazorpay}
              disabled={triggerLoading}
              className="px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-500 transition-all cursor-pointer"
            >
              {triggerLoading ? "Invoking APIs..." : "Execute Live Razorpay + 3x LLM"}
            </button>
          </div>
        </div>
      )}

      {/* Minimal Footer Tagline matching personal/phs */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t text-[11px] font-mono text-zinc-600" style={{ borderColor: "#1e2026" }}>
        <span>AI PROPOSES &middot; POLICY DECIDES &middot; CRYPTOGRAPHICALLY SIGNED RECEIPTS</span>
        <div className="flex items-center gap-3">
          <Link href="/ledger" className="hover:text-zinc-400 flex items-center gap-1">
            <span>Ledger</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
          <Link href="/admin" className="hover:text-zinc-400 flex items-center gap-1">
            <span>Admin</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
