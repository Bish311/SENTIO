"use client";

import { formatPaiseToRupees } from "@/lib/format";
import { TrendingUp, ShieldAlert, Zap, Layers } from "lucide-react";

interface CounterProps {
  recoveredPaise: number;
  avoidedPaise: number;
  activeCasesCount: number;
  guardrailBlocksCount: number;
  recoveryRate?: number;
  isOnline: boolean;
}

export function CounterCards({
  recoveredPaise,
  avoidedPaise,
  activeCasesCount,
  guardrailBlocksCount,
  recoveryRate = 0,
  isOnline,
}: CounterProps) {
  const hasData = recoveredPaise > 0 || avoidedPaise > 0 || activeCasesCount > 0 || guardrailBlocksCount > 0;

  const cards = [
    {
      title: "Revenue Recovered",
      value: hasData ? formatPaiseToRupees(recoveredPaise) : "—",
      sub: hasData ? `${(recoveryRate * 100).toFixed(1)}% recovery rate` : "Awaiting initial batch",
      icon: TrendingUp,
      color: "#10b981",
      bg: "rgba(16,185,129,0.12)",
      border: "rgba(16,185,129,0.3)",
    },
    {
      title: "Loss Avoided (Pulse)",
      value: hasData ? formatPaiseToRupees(avoidedPaise) : "—",
      sub: "Proactive mandate & card sweeps",
      icon: Zap,
      color: "#0284c7",
      bg: "rgba(2,132,199,0.12)",
      border: "rgba(2,132,199,0.3)",
    },
    {
      title: "Active Pipeline",
      value: activeCasesCount.toString(),
      sub: "Cases in recovery ladder",
      icon: Layers,
      color: "#8b5cf6",
      bg: "rgba(139,92,246,0.12)",
      border: "rgba(139,92,246,0.3)",
    },
    {
      title: "Guardrail Blocks",
      value: guardrailBlocksCount.toString(),
      sub: "100% policy violations gated",
      icon: ShieldAlert,
      color: "#ef4444",
      bg: "rgba(239,68,68,0.12)",
      border: "rgba(239,68,68,0.3)",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div key={i} className="card p-6 flex flex-col justify-between min-h-[145px]">
            <div className="flex items-center justify-between mb-4">
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--text-muted)" }}
              >
                {c.title}
              </span>
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 border"
                style={{ background: c.bg, borderColor: c.border }}
              >
                <Icon className="w-5 h-5" style={{ color: c.color }} />
              </div>
            </div>

            <div>
              <div
                className="text-2xl sm:text-3xl font-extrabold tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                {!isOnline && !hasData ? "—" : c.value}
              </div>
              <p
                className="text-xs font-medium mt-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                {c.sub}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
