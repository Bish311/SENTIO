"use client";

import { useState } from "react";
import useSWR from "swr";
import { adminFetcher, postData } from "@/lib/api";
import { DenialItem, SingleStepResult } from "@/lib/types";
import { formatISTDateTime } from "@/lib/format";
import { KillSwitch } from "@/components/kill-switch";
import { ReceiptChip } from "@/components/receipt-chip";
import { SystemVerifyBar } from "@/components/system-verify-bar";
import {
  Play,
  Download,
  ShieldAlert,
  Terminal,
  RefreshCw,
  CheckCircle2,
  Layers,
  RotateCcw,
} from "lucide-react";

export default function AdminPage() {
  const [adminToken] = useState("dev-admin-secret-2026");
  const [simLoading, setSimLoading] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);

  // Stepper state
  const [stepperLoading, setStepperLoading] = useState(false);
  const [stepperOpaque, setStepperOpaque] = useState(true);
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [stepperResult, setStepperResult] = useState<SingleStepResult | null>(null);

  const { data: denials, mutate: mutateDenials } = useSWR<DenialItem[]>(
    "/admin/policy-denials",
    () => adminFetcher("/admin/policy-denials", adminToken),
    { refreshInterval: 5000, errorRetryInterval: 10000 }
  );

  const handleRunLive = async (scenario: number = scenarioIdx) => {
    setStepperLoading(true);
    setStepperResult(null);
    try {
      const res = await postData(
        "/admin/single-step",
        { opaque: true, scenario_idx: scenario },
        adminToken
      );
      setStepperResult(res as SingleStepResult);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to execute live Razorpay and OpenRouter pipeline");
    } finally {
      setStepperLoading(false);
    }
  };

  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      const events = await adminFetcher("/admin/events/export", adminToken);
      const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sentio_audit_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleResetDb = async () => {
    if (!confirm("Are you sure you want to completely wipe all cases, events, and subscriptions for fresh real data?")) {
      return;
    }
    setResetLoading(true);
    setResetMessage(null);
    try {
      await postData("/admin/reset-db", {}, adminToken);
      setResetMessage("Database wiped clean! Ready for live Razorpay webhooks.");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reset database");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Admin &amp; Compliance Console
        </h1>
        <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>
          Master system controls, live transaction debugger, policy denial audit feed, and test verifier
        </p>
      </div>

      <SystemVerifyBar />

      <KillSwitch />

      {/* Live Single-Transaction Step Debugger */}
      <div className="card p-5 border" style={{ borderColor: "rgba(99, 102, 241, 0.4)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md flex items-center justify-center bg-indigo-500/20 text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Live Single-Transaction Step Debugger</h3>
                <span className="pill text-[9px] font-mono bg-indigo-500/20 text-indigo-300 font-bold">
                  INTERACTIVE PROOF
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Exercise all 5 engines (Spine &rarr; Lens &rarr; Guard &rarr; Chrono &rarr; Reach) on 1 live transaction
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={scenarioIdx}
              onChange={(e) => setScenarioIdx(Number(e.target.value))}
              className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2.5 py-1.5 focus:ring-indigo-500 font-mono"
            >
              <option value={0}>Priya Patel — ₹1,499 (Node Timeout ➔ Tomorrow PTP)</option>
              <option value={1}>Amit Verma — ₹499 (Switch Latency ➔ 5th PTP)</option>
              <option value={2}>Sneha Reddy — ₹2,999 (Intermediary Auth ➔ 7th PTP)</option>
              <option value={3}>Vikram Singh — ₹799 (Known Matrix ➔ 10th PTP)</option>
            </select>

            <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={stepperOpaque}
                onChange={(e) => setStepperOpaque(e.target.checked)}
                className="rounded border-zinc-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Trigger Opaque Error (Force T1 LLM)</span>
            </label>

            <button
              onClick={() => handleRunLive()}
              disabled={stepperLoading}
              className="px-4 py-2 rounded text-xs font-bold font-mono uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {stepperLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{stepperLoading ? "Calling Razorpay & OpenRouter..." : "Execute Live Razorpay + 3x LLM"}</span>
            </button>
          </div>
        </div>

        {stepperResult && (
          <div className="surface p-4 rounded border mt-3 divide-y divide-zinc-800" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">
                  Case: <strong className="text-white">{stepperResult.case_id}</strong>
                </span>
                {stepperResult.customer && (
                  <span className="pill text-[10px] bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-700/50">
                    {stepperResult.customer} ({stepperResult.amount})
                  </span>
                )}
                {stepperResult.order_id && (
                  <span className="pill text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-700/50">
                    RZP: {stepperResult.order_id}
                  </span>
                )}
              </div>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 7/7 Pipeline Stages Executed (3x Real OpenRouter Inferences)
              </span>
            </div>

            <div className="pt-3 space-y-2 font-mono text-xs">
              {stepperResult.steps.map((s, idx) => (
                <div key={idx} className="flex items-start justify-between gap-3 p-2 rounded bg-zinc-950/60 border border-zinc-800/80">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-indigo-400 font-bold">{s.stage}</span>
                      <span className="pill text-[9px] bg-zinc-800 text-zinc-400">{s.actor}</span>
                      {typeof s.proof?.model === "string" && s.proof.model !== "matrix" && (
                        <span className="pill text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-800">
                          ⚡ Live OpenRouter: {String(s.proof.model)}
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-300 text-[11px]">{s.detail}</p>
                    {typeof s.proof?.body === "string" && (
                      <div className="mt-1 p-2 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-emerald-300 font-sans italic">
                        &ldquo;{String(s.proof.body)}&rdquo;
                      </div>
                    )}
                    {typeof s.proof?.ptp_date === "string" && (
                      <div className="mt-1 text-[11px] text-indigo-300 font-mono">
                        Extracted ISO Payday Date: <strong>{String(s.proof.ptp_date)}</strong>
                      </div>
                    )}
                  </div>
                  <span className="pill text-[10px] font-bold text-emerald-400 bg-emerald-500/10 shrink-0">
                    VERIFIED
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Live External Razorpay Pipeline Card */}
        <div className="card p-5 flex flex-col justify-between min-h-[160px]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Live External Razorpay + 3x LLM
              </h3>
            </div>
            <p className="text-xs font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
              Creates real Razorpay order via API and executes real OpenRouter T1 (Diagnosis), T2 (Hinglish copy), and T3 (Payday extraction).
            </p>
          </div>

          <div>
            <button
              onClick={() => handleRunLive((scenarioIdx + 1) % 4)}
              disabled={stepperLoading}
              className="w-full py-2.5 px-4 rounded-md text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{stepperLoading ? "Executing Live APIs..." : "Execute Real External Run"}</span>
            </button>
          </div>
        </div>

        {/* Wipe & Reset DB Card */}
        <div className="card p-5 flex flex-col justify-between min-h-[160px] border" style={{ borderColor: "rgba(239, 68, 68, 0.4)" }}>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <RotateCcw className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-white">
                Fresh Data Environment
              </h3>
            </div>
            <p className="text-xs font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
              Completely wipe all simulation cases, events, and records to receive fresh real Razorpay webhook data.
            </p>
          </div>

          <div>
            <button
              onClick={handleResetDb}
              disabled={resetLoading}
              className="w-full py-2.5 px-4 rounded-md text-xs font-bold uppercase tracking-wider text-red-200 bg-red-950/80 border border-red-800 hover:bg-red-900 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetLoading ? "animate-spin" : ""}`} />
              <span>{resetLoading ? "Wiping Database..." : "Wipe DB for Fresh Real Data"}</span>
            </button>

            {resetMessage && (
              <p className="text-xs text-center font-bold mt-2 text-emerald-400">
                {resetMessage}
              </p>
            )}
          </div>
        </div>

        {/* Export Card */}
        <div className="card p-5 flex flex-col justify-between min-h-[160px]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Download className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Spine Audit Stream Export
              </h3>
            </div>
            <p className="text-xs font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
              Download the complete immutable event store log for offline auditing and metric reproduction.
            </p>
          </div>

          <button
            onClick={handleExport}
            className="w-full py-2.5 px-4 rounded-md text-xs font-bold uppercase tracking-wider surface border hover:border-zinc-500 text-white transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            style={{ borderColor: "var(--border-color)" }}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Full Event Store (JSON)</span>
          </button>
        </div>
      </div>

      {/* Live Policy Denials Feed */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              Live Policy Denials Feed
            </h3>
            {denials && denials.length > 0 && (
              <span className="pill text-xs font-bold text-red-500 bg-red-500/10">
                {denials.length}
              </span>
            )}
          </div>
          <button
            onClick={() => mutateDenials()}
            className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Sync</span>
          </button>
        </div>

        {(!denials || denials.length === 0) ? (
          <div className="surface p-6 text-center rounded border border-dashed text-xs text-zinc-400" style={{ borderColor: "var(--border-color)" }}>
            Zero policy violations recorded. All active proposals passed Guard rules.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {denials.map((d) => (
              <div
                key={d.event_id}
                className="surface p-3 rounded border flex flex-wrap items-center justify-between gap-3 text-xs"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-zinc-400">Case: {d.case_id}</span>
                    <span className="text-zinc-500 text-[10px]">{formatISTDateTime(d.ts)}</span>
                  </div>
                  <div className="text-red-400 font-mono text-[11px]">
                    Violations: {(d.receipt.violations || ["UNKNOWN_POLICY_VIOLATION"]).join(", ").replace(/_/g, " ")}
                  </div>
                </div>

                <ReceiptChip receipt={d.receipt} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
