"use client";

import Link from "next/link";
import { CaseItem } from "@/lib/types";
import { formatPaiseToRupees, formatRelativeTime } from "@/lib/format";
import { ArrowUpRight, Clock, User } from "lucide-react";

interface PipelineBoardProps {
  cases: CaseItem[];
}

const COLUMNS = [
  { id: "opened", label: "Opened", states: ["opened"], dot: "#f59e0b", badgeBg: "rgba(245,158,11,0.15)", badgeText: "#d97706" },
  { id: "diagnosed", label: "Diagnosed", states: ["diagnosed"], dot: "#0ea5e9", badgeBg: "rgba(14,165,233,0.15)", badgeText: "#0284c7" },
  { id: "in_recovery", label: "In Recovery", states: ["in_recovery"], dot: "#6366f1", badgeBg: "rgba(99,102,241,0.15)", badgeText: "#4f46e5" },
  { id: "settled", label: "Settled", states: ["settled"], dot: "#10b981", badgeBg: "rgba(16,185,129,0.15)", badgeText: "#059669" },
  { id: "closed", label: "Closed / Halted", states: ["halted", "closed"], dot: "#94a3b8", badgeBg: "rgba(148,163,184,0.15)", badgeText: "#64748b" },
];

export function PipelineBoard({ cases }: PipelineBoardProps) {
  if (cases.length === 0) {
    return (
      <div className="card p-6 sm:p-7 h-full flex flex-col justify-between min-h-[460px]">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              Recovery Pipeline Board
            </h2>
            <span
              className="pill"
              style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}
            >
              0 Total Cases
            </span>
          </div>
          <p className="text-xs mb-6 font-medium" style={{ color: "var(--text-muted)" }}>
            Real-time state progression for active and completed cases across recovery ladders.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            {COLUMNS.map((col) => (
              <div
                key={col.id}
                className="surface p-5 flex flex-col items-center justify-center gap-2.5 min-h-[220px]"
                style={{ border: "1px dashed var(--border-color)" }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.dot }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    {col.label}
                  </span>
                </div>
                <span className="text-2xl font-extrabold" style={{ color: "var(--text-muted)" }}>0</span>
                <span className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>₹0 volume</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="surface p-3.5 mt-6 text-center text-xs font-semibold"
          style={{ color: "var(--text-secondary)" }}
        >
          No active cases yet. Head to the <strong style={{ color: "var(--text-primary)" }}>Admin</strong> page to launch a seeded simulation batch.
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 min-h-[460px] flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Recovery Pipeline Board
          </h2>
          <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
            {cases.length} total cases in active and historical lifecycles
          </p>
        </div>
        <span
          className="pill"
          style={{ background: "var(--bg-surface)", color: "var(--text-secondary)" }}
        >
          {cases.length} Cases
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 flex-1">
        {COLUMNS.map((col) => {
          const items = cases.filter((c) => col.states.includes(c.state));
          const totalPaise = items.reduce(
            (acc, curr) => acc + (curr.state === "settled" ? curr.recovered_paise : curr.amount_at_risk_paise),
            0
          );

          return (
            <div key={col.id} className="surface p-3 flex flex-col min-h-[320px]">
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b" style={{ borderColor: "var(--border-color)" }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.dot }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                    {col.label}
                  </span>
                </div>
                <span
                  className="pill text-[10px]"
                  style={{ background: col.badgeBg, color: col.badgeText }}
                >
                  {items.length}
                </span>
              </div>

              <div className="text-[11px] font-bold mb-2.5 px-1" style={{ color: "var(--text-muted)" }}>
                Volume: {formatPaiseToRupees(totalPaise)}
              </div>

              <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-[380px] pr-0.5">
                {items.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-xs italic font-medium" style={{ color: "var(--text-muted)" }}>No cases</span>
                  </div>
                ) : (
                  items.map((c) => (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="group p-3 rounded-md transition-all block border"
                      style={{
                        background: "var(--bg-card)",
                        borderColor: "var(--border-color)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-mono font-bold truncate pr-1" style={{ color: "var(--text-primary)" }}>
                          {c.id.slice(0, 12)}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" style={{ color: "var(--text-primary)" }} />
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                        <User className="w-3 h-3" />
                        <span className="truncate">{c.customer_id}</span>
                      </div>

                      {c.root_cause && (
                        <div className="mb-2">
                          <span
                            className="pill text-[9px]"
                            style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}
                          >
                            {c.root_cause.replace(/_/g, " ")}
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: "var(--border-color)" }}>
                        <span className="text-xs font-extrabold" style={{ color: "var(--text-primary)" }}>
                          {formatPaiseToRupees(c.state === "settled" ? c.recovered_paise : c.amount_at_risk_paise)}
                        </span>
                        <span className="text-[10px] flex items-center gap-0.5 font-medium" style={{ color: "var(--text-muted)" }}>
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(c.opened_at)}
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
