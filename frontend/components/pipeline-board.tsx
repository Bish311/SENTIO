"use client";

import { useState } from "react";
import Link from "next/link";
import { CaseItem } from "@/lib/types";
import { formatPaiseToRupees } from "@/lib/format";
import {
  ArrowUpRight,
  Sparkles,
  Filter,
  Calendar,
} from "lucide-react";

interface PipelineBoardProps {
  cases: CaseItem[];
}

export function PipelineBoard({ cases }: PipelineBoardProps) {
  const [filterMode, setFilterMode] = useState<"all" | "t1_llm" | "matrix" | "ptp" | "settled">("all");

  const filteredCases = cases.filter((c) => {
    if (filterMode === "all") return true;
    const rc = (c.root_cause || "").toLowerCase();
    const st = (c.state || "").toLowerCase();
    if (filterMode === "t1_llm") {
      return rc === "cash_timing" || rc === "friction" || rc === "other";
    }
    if (filterMode === "matrix") {
      return rc === "transient" || rc === "dead_instrument" || rc === "budget_burned";
    }
    if (filterMode === "ptp") {
      return rc === "cash_timing" || st === "in_recovery";
    }
    if (filterMode === "settled") {
      return st === "settled" || st === "recovered";
    }
    return true;
  });

  return (
    <div className="card p-5 sm:p-6 flex flex-col gap-5 min-h-[500px]">
      {/* 5-Engine Flow Visualizer Header */}
      <div className="surface p-4 rounded-lg border flex flex-col gap-3" style={{ borderColor: "var(--border-color)" }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-sm font-bold tracking-tight text-white">
              Autonomous Recovery Architecture Pipeline
            </h2>
          </div>
          <span className="pill text-[10px] font-mono bg-indigo-500/20 text-indigo-300 font-semibold">
            FAIL-CLOSED DETERMINISTIC GATING
          </span>
        </div>

        {/* The 5 Stages Flow */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs font-mono">
          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
            <span className="text-[10px] text-zinc-500 block">STAGE 1: SPINE</span>
            <strong className="text-zinc-200 block text-[11px]">HMAC Ingest</strong>
            <span className="text-[10px] text-emerald-400">SHA-256 Verified</span>
          </div>

          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
            <span className="text-[10px] text-zinc-500 block">STAGE 2: LENS</span>
            <strong className="text-zinc-200 block text-[11px]">Matrix vs T1 LLM</strong>
            <span className="text-[10px] text-cyan-400">&ge;0.70 Conf Floor</span>
          </div>

          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
            <span className="text-[10px] text-zinc-500 block">STAGE 3: GUARD</span>
            <strong className="text-zinc-200 block text-[11px]">8 Policy Rules</strong>
            <span className="text-[10px] text-amber-400">Signed Receipts</span>
          </div>

          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800">
            <span className="text-[10px] text-zinc-500 block">STAGE 4: CHRONO</span>
            <strong className="text-zinc-200 block text-[11px]">Temporal Lock</strong>
            <span className="text-[10px] text-indigo-400">Quiet Hours/Payday</span>
          </div>

          <div className="bg-zinc-900/60 p-2.5 rounded border border-zinc-800 col-span-2 md:col-span-1">
            <span className="text-[10px] text-zinc-500 block">STAGE 5: REACH</span>
            <strong className="text-zinc-200 block text-[11px]">T2 Copy &amp; T3 PTP</strong>
            <span className="text-[10px] text-emerald-400">Defensive Linter</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-zinc-400 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            onClick={() => setFilterMode("all")}
            className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
              filterMode === "all" ? "bg-zinc-700 text-white font-bold" : "surface text-zinc-400 hover:text-white"
            }`}
          >
            All Cases ({cases.length})
          </button>
          <button
            onClick={() => setFilterMode("t1_llm")}
            className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
              filterMode === "t1_llm" ? "bg-cyan-900/60 text-cyan-300 font-bold border border-cyan-700" : "surface text-zinc-400 hover:text-white"
            }`}
          >
            T1 Neural LLM Path
          </button>
          <button
            onClick={() => setFilterMode("matrix")}
            className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
              filterMode === "matrix" ? "bg-emerald-900/60 text-emerald-300 font-bold border border-emerald-700" : "surface text-zinc-400 hover:text-white"
            }`}
          >
            Matrix Fast-Path (2ms)
          </button>
          <button
            onClick={() => setFilterMode("ptp")}
            className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
              filterMode === "ptp" ? "bg-indigo-900/60 text-indigo-300 font-bold border border-indigo-700" : "surface text-zinc-400 hover:text-white"
            }`}
          >
            T3 Payday Locked
          </button>
          <button
            onClick={() => setFilterMode("settled")}
            className={`px-2.5 py-1 rounded cursor-pointer transition-all ${
              filterMode === "settled" ? "bg-emerald-600 text-white font-bold" : "surface text-zinc-400 hover:text-white"
            }`}
          >
            Settled ({cases.filter((c) => ["settled", "recovered"].includes((c.state || "").toLowerCase())).length})
          </button>
        </div>

        <span className="text-[11px] font-mono text-zinc-500">
          Showing {filteredCases.length} of {cases.length} cases
        </span>
      </div>

      {/* Case Cards Grid */}
      {filteredCases.length === 0 ? (
        <div className="surface p-12 text-center rounded border border-dashed text-zinc-400 text-xs" style={{ borderColor: "var(--border-color)" }}>
          No cases match this architectural filter. Run a simulation from the Admin console.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCases.map((c) => {
            const isSettled = ["settled", "recovered"].includes((c.state || "").toLowerCase());
            const isArmA = c.arm === "agent" || (c.arm || "").toLowerCase().includes("arm a");
            const isT1 = ["cash_timing", "friction", "other"].includes((c.root_cause || "").toLowerCase());

            return (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="surface p-3.5 rounded border hover:border-zinc-500 transition-all flex flex-col justify-between gap-3 text-xs group"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] text-zinc-400 group-hover:text-indigo-400 transition-colors">
                      {c.id.slice(0, 18)}...
                    </span>
                    <span
                      className={`pill text-[10px] font-mono font-bold ${
                        isSettled
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {c.state?.toUpperCase() || "ACTIVE"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-extrabold font-mono text-white">
                      {formatPaiseToRupees(isSettled ? c.recovered_paise : c.amount_at_risk_paise)}
                    </span>
                    <span
                      className={`pill text-[10px] font-bold ${
                        isArmA
                          ? "bg-indigo-500/20 text-indigo-300"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {isArmA ? "Arm A (Sentio AI)" : "Arm B (Baseline)"}
                    </span>
                  </div>

                  {/* Architectural Engine Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span
                      className={`pill text-[10px] font-mono ${
                        isT1
                          ? "bg-cyan-500/15 text-cyan-300 border border-cyan-800/60"
                          : "bg-emerald-500/15 text-emerald-300 border border-emerald-800/60"
                      }`}
                    >
                      <Sparkles className="w-2.5 h-2.5 inline mr-1" />
                      {isT1 ? "T1 Neural LLM" : "Matrix Fast-Path"}
                    </span>

                    <span className="pill text-[10px] font-mono bg-zinc-800 text-zinc-300">
                      Cause: <strong>{c.root_cause || "diagnosed"}</strong>
                    </span>

                    {c.root_cause === "cash_timing" && (
                      <span className="pill text-[10px] font-mono bg-indigo-500/15 text-indigo-300">
                        <Calendar className="w-2.5 h-2.5 inline mr-1" />
                        Payday Lock
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t text-zinc-500 font-mono" style={{ borderColor: "var(--border-color)" }}>
                  <span>Cust: {c.customer_id?.slice(0, 10) || "cust_..."}</span>
                  <span className="flex items-center gap-1 text-zinc-400 group-hover:text-white transition-colors">
                    Inspect Trace <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
