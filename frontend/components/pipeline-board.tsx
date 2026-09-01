"use client";

import Link from "next/link";
import { CaseItem } from "@/lib/types";
import { formatPaiseToRupees, formatRelativeTime } from "@/lib/format";
import { ArrowUpRight, Clock, User } from "lucide-react";

interface PipelineBoardProps {
  cases: CaseItem[];
}

export function PipelineBoard({ cases }: PipelineBoardProps) {
  const columns = [
    {
      id: "opened",
      label: "Opened",
      states: ["opened"],
      color: "border-amber-400/40 bg-amber-500/5 text-amber-600 dark:text-amber-400",
    },
    {
      id: "diagnosed",
      label: "Diagnosed",
      states: ["diagnosed"],
      color: "border-sky-400/40 bg-sky-500/5 text-sky-600 dark:text-sky-400",
    },
    {
      id: "in_recovery",
      label: "In Recovery",
      states: ["in_recovery"],
      color: "border-indigo-400/40 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400",
    },
    {
      id: "settled",
      label: "Settled / Recovered",
      states: ["settled"],
      color: "border-emerald-400/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    },
    {
      id: "closed",
      label: "Halted / Closed",
      states: ["halted", "closed"],
      color: "border-slate-400/40 bg-slate-500/5 text-slate-600 dark:text-slate-400",
    },
  ];

  return (
    <div className="custom-card rounded-2xl p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            Recovery Pipeline Board
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time state progression for active and completed cases
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full custom-surface">
          {cases.length} Total Cases
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-x-auto">
        {columns.map((col) => {
          const columnCases = cases.filter((c) => col.states.includes(c.state));
          const totalPaise = columnCases.reduce(
            (acc, curr) => acc + (curr.state === "settled" ? curr.recovered_paise : curr.amount_at_risk_paise),
            0
          );

          return (
            <div
              key={col.id}
              className="flex flex-col rounded-xl custom-surface p-3 min-w-[210px] min-h-[360px]"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-inherit">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full border ${col.color}`} />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    {col.label}
                  </span>
                </div>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-white/50 dark:bg-black/20 text-slate-700 dark:text-slate-300">
                  {columnCases.length}
                </span>
              </div>

              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2.5 px-1">
                Volume: {formatPaiseToRupees(totalPaise)}
              </div>

              <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-[460px] pr-0.5">
                {columnCases.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500 italic">
                    No cases
                  </div>
                ) : (
                  columnCases.map((caseItem) => (
                    <Link
                      key={caseItem.id}
                      href={`/cases/${caseItem.id}`}
                      className="group bg-white dark:bg-slate-900/80 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-400 dark:hover:border-slate-600 transition-all text-left flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                            {caseItem.id.slice(0, 12)}...
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                          <User className="w-3 h-3" />
                          <span>{caseItem.customer_id}</span>
                        </div>

                        {caseItem.root_cause && (
                          <div className="mb-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {caseItem.root_cause.replace(/_/g, " ")}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatPaiseToRupees(
                            caseItem.state === "settled" ? caseItem.recovered_paise : caseItem.amount_at_risk_paise
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatRelativeTime(caseItem.opened_at)}
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
