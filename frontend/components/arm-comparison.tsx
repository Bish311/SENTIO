"use client";

import { BatchMetricsResponse } from "@/lib/types";
import { formatPaiseToRupees } from "@/lib/format";
import { Award } from "lucide-react";

interface ArmComparisonProps {
  metrics: BatchMetricsResponse;
}

export function ArmComparison({ metrics }: ArmComparisonProps) {
  const armA = metrics.arm_a;
  const armB = metrics.arm_b;

  return (
    <div className="custom-card rounded-2xl p-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-6 border-b border-inherit">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Two-Arm Controlled Recovery Experiment
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
              {metrics.lift}x LIFT
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Same failure seed, identical initial conditions · Arm A (Sentio Policy Engine) vs Arm B (Naive Immediate Retry)
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl custom-surface font-mono text-xs text-slate-700 dark:text-slate-300">
          <span>Batch:</span>
          <span className="font-bold text-slate-900 dark:text-white">{metrics.batch_id}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        <div className="rounded-2xl p-5 border-2 border-emerald-500/40 bg-emerald-500/5 relative flex flex-col justify-between">
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-sm">
              <Award className="w-3.5 h-3.5" />
              SENTIO (ARM A)
            </span>
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              Policy-Governed AI Recovery
            </span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1 mb-4">
              {formatPaiseToRupees(armA.recovered_paise)}
            </div>

            <div className="space-y-3 pt-3 border-t border-emerald-500/20 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Recovery Rate</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {(armA.recovery_rate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Recovered / Total Cases</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {armA.recovered_cases} / {armA.total_cases}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Median Time to Recovery</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {Math.round(armA.median_ttr_s / 3600)}h ({armA.median_ttr_s}s)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-slate-400">Guardrail Interceptions</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {metrics.guardrail_blocks} violations blocked
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
            Lens root cause diagnosis + Chrono payday timing + 8 Guard rules.
          </div>
        </div>

        <div className="rounded-2xl p-5 custom-surface border border-slate-300 dark:border-slate-800 flex flex-col justify-between opacity-85">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Gateway Naive Retries
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              BASELINE (ARM B)
            </span>
          </div>

          <div>
            <div className="text-3xl font-extrabold text-slate-700 dark:text-slate-300 mt-1 mb-4">
              {formatPaiseToRupees(armB.recovered_paise)}
            </div>

            <div className="space-y-3 pt-3 border-t border-inherit text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Recovery Rate</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                  {(armB.recovery_rate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Recovered / Total Cases</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {armB.recovered_cases} / {armB.total_cases}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Median Time to Recovery</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {Math.round(armB.median_ttr_s / 3600)}h ({armB.median_ttr_s}s)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Harassment Policy</span>
                <span className="font-semibold text-rose-500">
                  Burns mandate retry budget blindly
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-inherit text-[11px] text-slate-500 dark:text-slate-400">
            Immediate retry x3 per gateway default without quiet hours or payday awareness.
          </div>
        </div>
      </div>
    </div>
  );
}
