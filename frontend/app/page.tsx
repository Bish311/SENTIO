"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, postData } from "@/lib/api";
import { CaseDetail, CaseItem } from "@/lib/types";
import { TransactionFlowchart } from "@/components/transaction-flowchart";
import { PrecautionFlowchart } from "@/components/precaution-flowchart";
import { formatPaiseToRupees } from "@/lib/format";
import Link from "next/link";
import { Play, RefreshCw, Zap, ShieldAlert, ExternalLink, ShieldCheck } from "lucide-react";

export default function CommandCenterPage() {
  const [activeMode, setActiveMode] = useState<"recovery" | "precaution">("recovery");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedPrecautionCaseId, setSelectedPrecautionCaseId] = useState<string | null>(null);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [sweepLoading, setSweepLoading] = useState(false);

  const { data: cases, mutate: mutateCases } = useSWR<CaseItem[]>(
    "/cases?limit=50",
    fetcher,
    { refreshInterval: 2500, errorRetryInterval: 6000 }
  );

  const { data: preventionMetrics, mutate: mutateMetrics } = useSWR(
    "/metrics/prevention",
    fetcher,
    { refreshInterval: 3000 }
  );

  const caseList = cases || [];
  const recoveryCases = caseList.filter((c) => c.kind !== "prevention");
  const preventionCases = caseList.filter(
    (c) => c.kind === "prevention" || (c.state === "closed" && c.outcome === "prevented")
  );

  const recoveredPaise = recoveryCases.reduce(
    (acc, c) =>
      acc +
      (((c.outcome || "").toLowerCase() === "recovered" ||
      (c.state || "").toLowerCase() === "recovered")
        ? c.recovered_paise
        : 0),
    0
  );
  const atRiskPaise = recoveryCases.reduce(
    (acc, c) => acc + (c.amount_at_risk_paise || 0),
    0
  );
  const recoveredCount = recoveryCases.filter(
    (c) =>
      (c.outcome || "").toLowerCase() === "recovered" ||
      (c.state || "").toLowerCase() === "recovered"
  ).length;
  const rate = recoveryCases.length > 0 ? (recoveredCount / recoveryCases.length) * 100 : 0;

  const preventedCount =
    preventionMetrics?.prevented_count ?? preventionCases.length;
  const avoidedPaise =
    preventionMetrics?.avoided_paise ??
    preventionCases.reduce(
      (acc, c) => acc + (c.recovered_paise || c.amount_at_risk_paise || 0),
      0
    );

  // Default to the latest active case, or first recovery case
  const defaultCase =
    recoveryCases.find(
      (c) => c.state === "opened" || c.state === "in_recovery" || c.state === "diagnosed"
    ) || recoveryCases[0];

  const currentCase = selectedCaseId
    ? recoveryCases.find((c) => c.id === selectedCaseId) || defaultCase
    : defaultCase;

  const { data: currentCaseDetail, mutate: mutateCurrentCase } = useSWR<CaseDetail>(
    currentCase ? `/cases/${currentCase.id}` : null,
    fetcher,
    { refreshInterval: 2000 }
  );

  const defaultPrecautionCase = preventionCases[0];
  const currentPrecautionCase = selectedPrecautionCaseId
    ? preventionCases.find((c) => c.id === selectedPrecautionCaseId) || defaultPrecautionCase
    : defaultPrecautionCase;

  const { data: currentPrecautionCaseDetail, mutate: mutatePrecautionCase } = useSWR<CaseDetail>(
    currentPrecautionCase ? `/cases/${currentPrecautionCase.id}` : null,
    fetcher,
    { refreshInterval: 2000 }
  );

  const SCENARIOS = [
    { label: "Salary on 7th (Hold auto-debit)", reply: "Salary 7th ko credit hogi company se, tab auto-debit hone dena" },
    { label: "Payday on 10th (Link active hold)", reply: "Mera payday 10 tarikh hai, tab tak payment link active rakhna please" },
    { label: "Train Travelling (Network drop)", reply: "Abhi out of station train me hu network nahi aa raha, kal shaam tak UPI se pay karta hu" },
    { label: "Card Blocked (Reissue in transit)", reply: "Purana debit card block ho gaya tha, naya card Tuesday tak aayega tab update karunga" },
    { label: "UPI Down (SBI/GPay server outage)", reply: "GPay aur SBI server down chal raha hai subah se, raat 9 baje try karta hu" },
    { label: "Savings Transfer (FD liquidation)", reply: "Savings account me paise kal transfer honge FD liquidate hone ke baad, parso pay kar dunga" },
    { label: "Client Invoice (Monday cheque)", reply: "Client ka invoice payment Monday 8th ko clear hoga, tabhi kar paunga" },
    { label: "Spouse OTP (Waiting for husband)", reply: "Ye card mere husband ka hai, wo kal sham ko office se aake OTP denge tab ho payega" },
    { label: "Month-End Salary (30th debit)", reply: "Mahine ke aakhri din 30 tarikh ko salary aati hai, tab debit kar lena" },
    { label: "Bonus Clearance (Friday 12th)", reply: "Bonus aane wala hai Friday ko, 12th ko settle karta hu pakka" },
    { label: "Billing Dispute Inquiry", reply: "Mujhe invoice samajh nahi aaya, kal account team se confirm karke parso pay karunga" },
    { label: "Morning Bank Visit (10 AM)", reply: "Main kal subah 10 baje bank open hote hi transfer kar dunga" },
  ];

  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);

  const handleRunFreshRazorpay = async () => {
    setTriggerLoading(true);
    try {
      const chosen = SCENARIOS[selectedScenarioIdx];
      const res = (await postData(
        "/admin/single-step",
        {
          opaque: true,
          scenario_idx: selectedScenarioIdx,
          custom_reply: chosen.reply,
        },
        process.env.NEXT_PUBLIC_ADMIN_TOKEN || "dev-admin-secret-2026"
      )) as { case_id: string };
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

  const handleRunSweepTop = async () => {
    setSweepLoading(true);
    try {
      const res = (await postData(
        "/admin/run-sweep",
        { seed_sample_risk: true },
        process.env.NEXT_PUBLIC_ADMIN_TOKEN || "dev-admin-secret-2026"
      )) as { prevented_items?: Array<{ case_id: string }> };
      await Promise.all([mutateCases(), mutateMetrics()]);
      if (res?.prevented_items?.[0]?.case_id) {
        setSelectedPrecautionCaseId(res.prevented_items[0].case_id);
      }
      await mutatePrecautionCase();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to run proactive sweep");
    } finally {
      setSweepLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Bar matching personal/phs with fixed geometry */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b min-h-[58px]"
        style={{ borderColor: "#1e2026" }}
      >
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
            {activeMode === "recovery"
              ? "Payment reliability & revenue protection pipeline — live from Razorpay APIs."
              : "Autonomous lookahead for mandate expiry and retry ceiling interception — precaution before cure."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher: Precaution vs Active Recovery */}
          <div className="flex items-center gap-1 bg-black/60 p-1 rounded border border-zinc-800">
            <button
              onClick={() => setActiveMode("recovery")}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                activeMode === "recovery"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
              }`}
            >
              Active Recovery (Cure)
            </button>
            <button
              onClick={() => setActiveMode("precaution")}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeMode === "precaution"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
              }`}
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Precaution Engine (Pulse)</span>
            </button>
          </div>

          {/* Symmetrically balanced action slots */}
          {activeMode === "recovery" ? (
            <div className="flex items-center gap-2">
              <select
                value={selectedScenarioIdx}
                onChange={(e) => setSelectedScenarioIdx(Number(e.target.value))}
                className="bg-black/60 border border-zinc-800 text-zinc-300 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none cursor-pointer max-w-[200px] truncate"
                title="Select Customer Repayment Scenario"
              >
                {SCENARIOS.map((s, idx) => (
                  <option key={idx} value={idx} className="bg-zinc-900 text-zinc-200">
                    {idx + 1}. {s.label}
                  </option>
                ))}
              </select>

              <button
                onClick={handleRunFreshRazorpay}
                disabled={triggerLoading}
                className="min-w-[130px] h-[30px] px-3 rounded text-xs font-mono font-bold uppercase tracking-wider text-white bg-amber-600/90 hover:bg-amber-600 active:bg-amber-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border border-amber-500/40 shadow-sm shrink-0"
              >
                {triggerLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3 h-3 fill-current" />
                )}
                <span>{triggerLoading ? "Simulating..." : "Test Case"}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="pill text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold hidden sm:inline">
                LOOKAHEAD 30D
              </span>
              <button
                onClick={handleRunSweepTop}
                disabled={sweepLoading}
                className="min-w-[180px] h-[30px] px-3.5 rounded text-xs font-mono font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border border-emerald-400/40 shadow-sm shrink-0"
              >
                {sweepLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 fill-current" />
                )}
                <span>{sweepLoading ? "Scanning..." : "Run Pulse Sweep"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Selector Ribbon - ALWAYS RENDERED FOR ZERO LAYOUT SHIFT */}
      <div className="flex items-center justify-between gap-3 p-2.5 rounded bg-[#0d0e12] border border-zinc-800/80 text-xs font-mono min-h-[44px]">
        {activeMode === "recovery" ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase text-[10px]">Select Active Transaction:</span>
              <select
                value={currentCase?.id || ""}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="bg-black/60 border border-zinc-800 text-zinc-200 rounded px-2 py-1 font-mono focus:outline-none cursor-pointer"
              >
                {recoveryCases.length === 0 ? (
                  <option value="">No recovery transactions &middot; Run a Test Case</option>
                ) : (
                  recoveryCases.map((c) => (
                    <option key={c.id} value={c.id} className="bg-zinc-900 text-white">
                      {c.id} &middot; {formatPaiseToRupees(c.amount_at_risk_paise)} &middot; {(c.root_cause || c.state).toUpperCase()}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-zinc-400">
              <span>Recovered: <strong className="text-emerald-400">{formatPaiseToRupees(recoveredPaise)}</strong></span>
              <span>At Risk: <strong className="text-amber-400">{formatPaiseToRupees(atRiskPaise)}</strong></span>
              <span>Rate: <strong className="text-indigo-300">{rate.toFixed(1)}%</strong></span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase text-[10px]">Target Prevention Subscription:</span>
              <select
                value={currentPrecautionCase?.id || ""}
                onChange={(e) => setSelectedPrecautionCaseId(e.target.value)}
                className="bg-black/60 border border-zinc-800 text-zinc-200 rounded px-2 py-1 font-mono focus:outline-none cursor-pointer"
              >
                {preventionCases.length === 0 ? (
                  <option value="">No prevention cases yet &middot; Click Run Pulse Sweep</option>
                ) : (
                  preventionCases.map((c) => (
                    <option key={c.id} value={c.id} className="bg-zinc-900 text-white">
                      {c.id} &middot; {formatPaiseToRupees(c.amount_at_risk_paise)} &middot; {c.subscription_id || "active"}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-zinc-400">
              <span>Loss Avoided: <strong className="text-emerald-400">{formatPaiseToRupees(avoidedPaise)}</strong></span>
              <span>Churns Prevented: <strong className="text-indigo-300">{preventedCount}</strong></span>
              <span className="hidden sm:inline">Cadence: <strong className="text-zinc-300">Daily @ 06:00 IST</strong></span>
            </div>
          </>
        )}
      </div>

      {/* Mode View: Precaution Flowchart vs Active Recovery Flowchart */}
      {activeMode === "precaution" ? (
        <div className="p-4 rounded border bg-[#090a0d]" style={{ borderColor: "#1e2026" }}>
          <PrecautionFlowchart caseDetail={currentPrecautionCaseDetail} />
        </div>
      ) : currentCase && currentCaseDetail ? (
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
          <Link href="/admin" className="hover:text-zinc-400 flex items-center gap-1">
            <span>Admin &amp; Policy Console</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
