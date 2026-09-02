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
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b" style={{ borderColor: "var(--border-color)" }}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              Two-Arm Controlled Experiment
            </h2>
            <span
              className="pill text-xs font-bold"
              style={{
                background: "rgba(16,185,129,0.15)",
                color: "#10b981",
                border: "1px solid rgba(16,185,129,0.3)",
              }}
            >
              {metrics.lift}x RECOVERY LIFT
            </span>
          </div>
          <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Same failure seed · Arm A (Sentio AI + Policy Engine) vs Arm B (Naive Retries)
          </p>
        </div>
        <span
          className="pill font-mono text-[11px]"
          style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}
        >
          Batch: {metrics.batch_id}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Arm A Card */}
        <div
          className="surface p-4 rounded-md flex flex-col justify-between"
          style={{
            border: "1.5px solid #10b981",
            background: "var(--bg-card)",
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#10b981" }}>
                Policy-Governed AI Recovery
              </span>
              <span
                className="pill text-[10px] font-bold text-white flex items-center gap-1"
                style={{ background: "#10b981" }}
              >
                <Award className="w-3 h-3" />
                SENTIO (ARM A)
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight my-2" style={{ color: "var(--text-primary)" }}>
              {formatPaiseToRupees(armA.recovered_paise)}
            </div>

            <div className="space-y-2 pt-2.5 border-t text-xs font-medium" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--text-secondary)" }}>Recovery Rate</span>
                <span className="font-extrabold text-sm" style={{ color: "#10b981" }}>
                  {(armA.recovery_rate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--text-secondary)" }}>Recovered / Total</span>
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                  {armA.recovered_cases} / {armA.total_cases} cases
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--text-secondary)" }}>Median Time-to-Recovery</span>
                <span className="font-bold font-mono" style={{ color: "var(--text-primary)" }}>
                  {Math.round(armA.median_ttr_s / 3600)}h ({armA.median_ttr_s}s)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--text-secondary)" }}>Guardrail Interceptions</span>
                <span className="font-bold" style={{ color: "#10b981" }}>
                  {metrics.guardrail_blocks} violations blocked
                </span>
              </div>
            </div>
          </div>

          <p className="mt-3 pt-2 border-t text-[11px] font-medium" style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
            Lens matrix diagnosis + Chrono payday timing + 8 Guard rules.
          </p>
        </div>

        {/* Arm B Card */}
        <div
          className="surface p-4 rounded-md flex flex-col justify-between opacity-90"
          style={{
            border: "1px solid var(--border-color)",
            background: "var(--bg-card)",
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Gateway Default Retries
              </span>
              <span
                className="pill text-[10px] font-bold"
                style={{ background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border-color)" }}
              >
                BASELINE (ARM B)
              </span>
            </div>

            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight my-2" style={{ color: "var(--text-secondary)" }}>
              {formatPaiseToRupees(armB.recovered_paise)}
            </div>

            <div className="space-y-2 pt-2.5 border-t text-xs font-medium" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--text-secondary)" }}>Recovery Rate</span>
                <span className="font-bold text-sm" style={{ color: "var(--text-secondary)" }}>
                  {(armB.recovery_rate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--text-secondary)" }}>Recovered / Total</span>
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                  {armB.recovered_cases} / {armB.total_cases} cases
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--text-secondary)" }}>Median Time-to-Recovery</span>
                <span className="font-bold font-mono" style={{ color: "var(--text-muted)" }}>
                  {Math.round(armB.median_ttr_s / 3600)}h ({armB.median_ttr_s}s)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--text-secondary)" }}>Harassment Policy</span>
                <span className="font-semibold" style={{ color: "#ef4444" }}>
                  Burns retry budget blindly
                </span>
              </div>
            </div>
          </div>

          <p className="mt-3 pt-2 border-t text-[11px] font-medium" style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
            Immediate retry x3 per gateway default without quiet hours or payday awareness.
          </p>
        </div>
      </div>
    </div>
  );
}
