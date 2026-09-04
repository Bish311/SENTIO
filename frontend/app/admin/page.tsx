"use client";

import { useState } from "react";
import useSWR from "swr";
import { adminFetcher, postData } from "@/lib/api";
import { DenialItem } from "@/lib/types";
import { formatISTDateTime } from "@/lib/format";
import { KillSwitch } from "@/components/kill-switch";
import { ReceiptChip } from "@/components/receipt-chip";
import {
  Download,
  ShieldAlert,
  Terminal,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function AdminPage() {
  const [adminToken] = useState("dev-admin-secret-2026");

  const { data: denials, mutate: mutateDenials } = useSWR<DenialItem[]>(
    "/admin/policy-denials",
    () => adminFetcher("/admin/policy-denials", adminToken),
    { refreshInterval: 4000, errorRetryInterval: 8000 }
  );

  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      const events = await adminFetcher("/admin/events/export", adminToken);
      const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sentio_spine_audit_${Date.now()}.json`;
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
    <div className="space-y-5">
      {/* Header Bar matching personal/phs */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b" style={{ borderColor: "#1e2026" }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
              PULSERECOVER &middot; SENTIO
            </span>
            <span className="pill text-[9px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
              GOVERNANCE OPS
            </span>
          </div>
          <h1 className="text-xl font-mono font-extrabold text-white tracking-tight mt-0.5">
            Admin &amp; Policy Console
          </h1>
          <p className="text-xs font-mono text-zinc-400 mt-0.5">
            Cryptographic governance controls, safety kill-switch override, and regulatory denial audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="pill text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            POLICIES ENFORCED: 8 RULES
          </span>
        </div>
      </div>

      {/* Kill Switch Master Bar */}
      <div className="p-4 rounded border bg-[#0d0e12]" style={{ borderColor: "#1e2026" }}>
        <KillSwitch />
      </div>

      {/* System Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Wipe & Reset DB Card */}
        <div className="p-4 rounded border bg-[#0d0e12] flex flex-col justify-between min-h-[140px]" style={{ borderColor: "#1e2026" }}>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <RotateCcw className="w-4 h-4 text-red-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Fresh Data Environment Reset
              </h3>
            </div>
            <p className="text-xs font-mono text-zinc-400 mb-3 leading-relaxed">
              Completely clears all PostgreSQL cases, events, and customer records to prepare the environment for new Razorpay webhooks.
            </p>
          </div>

          <div>
            <button
              onClick={handleResetDb}
              disabled={resetLoading}
              className="w-full py-2 px-3 rounded text-xs font-mono font-bold uppercase tracking-wider text-red-300 bg-red-950/60 border border-red-800/80 hover:bg-red-900/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetLoading ? "animate-spin" : ""}`} />
              <span>{resetLoading ? "Wiping Database..." : "Wipe DB for Fresh Real Data"}</span>
            </button>

            {resetMessage && (
              <p className="text-[11px] font-mono text-center font-bold mt-2 text-emerald-400">
                {resetMessage}
              </p>
            )}
          </div>
        </div>

        {/* Export Spine Event Store Card */}
        <div className="p-4 rounded border bg-[#0d0e12] flex flex-col justify-between min-h-[140px]" style={{ borderColor: "#1e2026" }}>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Download className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Spine Audit Stream Export
              </h3>
            </div>
            <p className="text-xs font-mono text-zinc-400 mb-3 leading-relaxed">
              Download the complete append-only PostgreSQL event log as JSON for offline verification, regulatory auditing, and dispute proof.
            </p>
          </div>

          <button
            onClick={handleExport}
            className="w-full py-2 px-3 rounded text-xs font-mono font-bold uppercase tracking-wider text-zinc-200 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Full Event Store (JSON)</span>
          </button>
        </div>
      </div>

      {/* Live Policy Denials Feed (Audit Trail matching image.png in personal/phs) */}
      <div className="p-4 rounded border bg-[#090a0d]" style={{ borderColor: "#1e2026" }}>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Policy Denial Audit Trail
            </h3>
            {denials && denials.length > 0 && (
              <span className="pill text-[9px] font-mono font-bold text-red-400 bg-red-500/10 border border-red-500/30">
                {denials.length} GATED
              </span>
            )}
          </div>

          <button
            onClick={() => mutateDenials()}
            className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-mono"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Sync</span>
          </button>
        </div>

        {(!denials || denials.length === 0) ? (
          <div className="p-6 text-center rounded border border-dashed border-zinc-800 text-xs font-mono text-zinc-500">
            Zero policy violations recorded. All active proposals complied with regulatory rules.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {denials.map((d) => (
              <div
                key={d.event_id}
                className="p-3 rounded border border-zinc-800/80 bg-[#0d0e12] flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-zinc-400 font-bold">Case: {d.case_id}</span>
                    <span className="text-zinc-600 text-[10px]">{formatISTDateTime(d.ts)}</span>
                  </div>
                  <div className="text-red-400 text-[11px]">
                    Violations: {(d.receipt.violations || ["UNKNOWN_POLICY_VIOLATION"]).join(", ").replace(/_/g, " ")}
                  </div>
                </div>

                <ReceiptChip receipt={d.receipt} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Minimal Footer Tagline matching personal/phs */}
      <div className="pt-2 border-t text-[11px] font-mono text-zinc-600" style={{ borderColor: "#1e2026" }}>
        <span>AI PROPOSES &middot; POLICY DECIDES &middot; CRYPTOGRAPHICALLY SIGNED RECEIPTS</span>
      </div>
    </div>
  );
}
