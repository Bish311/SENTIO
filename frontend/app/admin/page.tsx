"use client";

import { useState } from "react";
import useSWR from "swr";
import { adminFetcher, postData } from "@/lib/api";
import { DenialItem } from "@/lib/types";
import { formatISTDateTime } from "@/lib/format";
import { KillSwitch } from "@/components/kill-switch";
import { ReceiptChip } from "@/components/receipt-chip";
import {
  ShieldAlert,
  Play,
  Download,
  Terminal,
  RefreshCw,
} from "lucide-react";

export default function AdminPage() {
  const [adminToken] = useState("dev-admin-secret-2026");
  const [simLoading, setSimLoading] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);

  const { data: denials, mutate: mutateDenials } = useSWR<DenialItem[]>(
    "/admin/policy-denials",
    () => adminFetcher("/admin/policy-denials", adminToken),
    { refreshInterval: 3000 }
  );

  const handleRunSimBatch = async () => {
    setSimLoading(true);
    setSimMessage(null);
    try {
      const res = await postData(
        "/sim/batch",
        { n: 20, seed: 42 },
        adminToken
      );
      setSimMessage(`Created batch ${String(res.batch_id)} with 20 seeded test cases!`);
    } catch (err: unknown) {
      setSimMessage(`Batch error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSimLoading(false);
    }
  };

  const handleExportEvents = async () => {
    try {
      const events = await adminFetcher("/admin/events/export", adminToken);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(events, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `sentio_spine_events_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: unknown) {
      alert("Failed to export events: " + (err instanceof Error ? err.message : "Unknown error"));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Admin & Compliance Console
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Master control, policy violation audit feed, and simulation batch tools
        </p>
      </div>

      <KillSwitch />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="custom-card rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-5 h-5 text-indigo-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Mirror Simulator Controls
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Generate wire-identical synthetic Razorpay failures (200-case seed or 20-case test batch) to exercise recovery ladders.
            </p>
          </div>

          <div className="space-y-3 pt-3 border-t border-inherit">
            <button
              onClick={handleRunSimBatch}
              disabled={simLoading}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                simLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Play className="w-4 h-4" />
              {simLoading ? "Generating Batch..." : "Run 20-Case Seeded Simulation"}
            </button>

            {simMessage && (
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 text-center">
                {simMessage}
              </p>
            )}
          </div>
        </div>

        <div className="custom-card rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-sky-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Spine Audit Stream Export
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Download the complete immutable event store log for offline auditing, compliance verification, and metric reproduction.
            </p>
          </div>

          <div className="pt-3 border-t border-inherit">
            <button
              onClick={handleExportEvents}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export Full Event Store (JSON)
            </button>
          </div>
        </div>
      </div>

      <div className="custom-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Live Policy Denials Feed
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Interventions blocked by Guard rules (quiet hours, contact caps, retry ceiling)
              </p>
            </div>
          </div>
          <button
            onClick={() => mutateDenials()}
            aria-label="Refresh denials"
            className="p-2 rounded-xl custom-surface hover:opacity-90 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
        </div>

        <div className="space-y-3">
          {(!denials || denials.length === 0) ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
              No policy denials recorded yet. All proposed interventions have complied with Guard rules.
            </div>
          ) : (
            denials.map((denial) => (
              <div
                key={denial.event_id}
                className="custom-surface rounded-xl p-4 border border-rose-500/20 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                      Case: {denial.case_id}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatISTDateTime(denial.ts)}
                    </span>
                  </div>
                  {denial.receipt?.violations && (
                    <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                      Violations: {denial.receipt.violations.join(", ").replace(/_/g, " ")}
                    </div>
                  )}
                </div>

                {denial.receipt && (
                  <div>
                    <ReceiptChip receipt={denial.receipt} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
