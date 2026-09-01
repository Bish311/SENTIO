"use client";

import { useState } from "react";
import useSWR from "swr";
import { adminFetcher, postData } from "@/lib/api";
import { DenialItem } from "@/lib/types";
import { formatISTDateTime } from "@/lib/format";
import { KillSwitch } from "@/components/kill-switch";
import { ReceiptChip } from "@/components/receipt-chip";
import { Play, Download, ShieldAlert, Terminal, RefreshCw } from "lucide-react";

export default function AdminPage() {
  const [adminToken] = useState("dev-admin-secret-2026");
  const [simLoading, setSimLoading] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);

  const { data: denials, mutate: mutateDenials } = useSWR<DenialItem[]>(
    "/admin/policy-denials",
    () => adminFetcher("/admin/policy-denials", adminToken),
    { refreshInterval: 5000, errorRetryInterval: 10000 }
  );

  const handleRunSim = async () => {
    setSimLoading(true);
    setSimMessage(null);
    try {
      const res = await postData("/sim/batch", { n: 20, seed: 42 });
      setSimMessage(`Batch ${String(res.batch_id)} created with 20 test cases!`);
    } catch (err: unknown) {
      setSimMessage(err instanceof Error ? err.message : "Failed to run simulation batch");
    } finally {
      setSimLoading(false);
    }
  };

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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Admin & Compliance Console
        </h1>
        <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>
          Master system controls, policy violation audit feed, and simulation batch runner
        </p>
      </div>

      <KillSwitch />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Simulator Controls Card */}
        <div className="card p-5 flex flex-col justify-between min-h-[160px]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Terminal className="w-4 h-4" style={{ color: "#6366f1" }} />
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Mirror Simulator Controls
              </h3>
            </div>
            <p className="text-xs font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
              Generate wire-identical synthetic Razorpay failures (20-case batch) to exercise recovery ladders.
            </p>
          </div>

          <div>
            <button
              onClick={handleRunSim}
              disabled={simLoading}
              className="w-full py-2.5 px-4 rounded-md text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{simLoading ? "Creating Batch..." : "Run 20-Case Seeded Simulation"}</span>
            </button>

            {simMessage && (
              <p className="text-xs text-center font-bold mt-2" style={{ color: "#6366f1" }}>
                {simMessage}
              </p>
            )}
          </div>
        </div>

        {/* Export Card */}
        <div className="card p-5 flex flex-col justify-between min-h-[160px]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Download className="w-4 h-4" style={{ color: "#0284c7" }} />
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Spine Audit Stream Export
              </h3>
            </div>
            <p className="text-xs font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
              Download the complete immutable event store log for offline auditing and metric reproduction.
            </p>
          </div>

          <div>
            <button
              onClick={handleExport}
              className="w-full py-2.5 px-4 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 active:opacity-100 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Full Event Store (JSON)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Policy Denials Feed Card */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" style={{ color: "#ef4444" }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              Live Policy Denials Feed
            </h3>
            {denials && denials.length > 0 && (
              <span className="pill text-[10px] font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                {denials.length}
              </span>
            )}
          </div>
          <button
            onClick={() => mutateDenials()}
            className="p-1 rounded-md text-xs font-medium surface flex items-center gap-1 cursor-pointer hover:opacity-80"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Sync</span>
          </button>
        </div>

        {(!denials || denials.length === 0) ? (
          <div className="surface p-4 text-center text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            No policy violations recorded yet. All proposed interventions have complied with Guard rules.
          </div>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {denials.map((d) => (
              <div
                key={d.event_id}
                className="surface p-3 flex flex-wrap items-center justify-between gap-2 border"
                style={{ borderColor: "rgba(239,68,68,0.25)" }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                      Case: {d.case_id}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                      {formatISTDateTime(d.ts)}
                    </span>
                  </div>
                  {d.receipt?.violations && d.receipt.violations.length > 0 && (
                    <p className="text-xs font-bold" style={{ color: "#ef4444" }}>
                      Violations: {d.receipt.violations.join(", ").replace(/_/g, " ")}
                    </p>
                  )}
                </div>
                {d.receipt && <ReceiptChip receipt={d.receipt} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
