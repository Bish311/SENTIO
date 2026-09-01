"use client";

import { formatPaiseToRupees } from "@/lib/format";
import { TrendingUp, ShieldAlert, Zap, Layers } from "lucide-react";

interface CounterProps {
  recoveredPaise: number;
  avoidedPaise: number;
  activeCasesCount: number;
  guardrailBlocksCount: number;
  recoveryRate?: number;
}

export function CounterCards({
  recoveredPaise,
  avoidedPaise,
  activeCasesCount,
  guardrailBlocksCount,
  recoveryRate = 0,
}: CounterProps) {
  const cards = [
    {
      title: "Revenue Recovered",
      value: formatPaiseToRupees(recoveredPaise),
      subtext: `${(recoveryRate * 100).toFixed(1)}% recovery rate across cases`,
      icon: TrendingUp,
      accent: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      pill: "LIVE AUDIT",
    },
    {
      title: "Loss Avoided (Pulse)",
      value: formatPaiseToRupees(avoidedPaise),
      subtext: "Proactive card/budget sweeps",
      icon: Zap,
      accent: "from-sky-500/20 to-sky-500/5 text-sky-600 dark:text-sky-400 border-sky-500/30",
      pill: "PREVENTED",
    },
    {
      title: "Active Pipeline",
      value: activeCasesCount.toString(),
      subtext: "Cases in temporal recovery",
      icon: Layers,
      accent: "from-indigo-500/20 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
      pill: "PIPELINE",
    },
    {
      title: "Guardrail Blocks",
      value: guardrailBlocksCount.toString(),
      subtext: "100% policy violations blocked",
      icon: ShieldAlert,
      accent: "from-rose-500/20 to-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/30",
      pill: "ZERO HARASSMENT",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="custom-card rounded-2xl p-5 relative overflow-hidden transition-all duration-200 hover:scale-[1.01]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                {card.title}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {card.pill}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {card.value}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  {card.subtext}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl bg-gradient-to-br border ${card.accent}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
