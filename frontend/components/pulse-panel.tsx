"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { PreventionMetricsResponse } from "@/lib/types";
import { formatPaiseToRupees } from "@/lib/format";
import { Activity, ShieldCheck, Zap, AlertTriangle } from "lucide-react";

export function PulsePanel() {
  const { data } = useSWR<PreventionMetricsResponse>(
    "/metrics/prevention",
    fetcher,
    { refreshInterval: 5000 }
  );

  const preventedCount = data?.prevented_count ?? 0;
  const avoidedPaise = data?.avoided_paise ?? 0;

  return (
    <div className="card p-4 sm:p-5 border" style={{ borderColor: "rgba(16, 185, 129, 0.3)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md flex items-center justify-center bg-emerald-500/15 text-emerald-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Pulse Precaution Engine
              </h2>
              <span className="pill text-[9px] font-mono bg-emerald-500/20 text-emerald-400 font-bold">
                PRECAUTION &gt; CURE
              </span>
            </div>
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
              Automated daily sweeps detecting expiring cards and mandate caps <strong>before</strong> payments fail
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider block text-zinc-400">
            Loss Avoided Proactively
          </span>
          <span className="text-base sm:text-lg font-mono font-extrabold text-emerald-400">
            {formatPaiseToRupees(avoidedPaise)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
        <div className="surface p-3 rounded border" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-zinc-400">EXPIRING CARDS</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-sm font-bold text-white">30-Day Lookahead</span>
          <p className="text-[10px] text-zinc-400 mt-0.5">Dispatches proactive card update link before mandate decline.</p>
        </div>

        <div className="surface p-3 rounded border" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-zinc-400">MANDATE BUDGET</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-sm font-bold text-white">Retry Cap Sweep</span>
          <p className="text-[10px] text-zinc-400 mt-0.5">Catches subscriptions at retry &ge; 2 before terminal exhaustion.</p>
        </div>

        <div className="surface p-3 rounded border" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-zinc-400">CHURN PREVENTED</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <span className="text-sm font-bold text-emerald-400">{preventedCount} Subscriptions</span>
          <p className="text-[10px] text-zinc-400 mt-0.5">Recovered with 0 customer dispute tickets and 0 bank penalty fees.</p>
        </div>
      </div>
    </div>
  );
}
