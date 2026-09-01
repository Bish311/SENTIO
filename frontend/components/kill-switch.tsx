"use client";

import { useState } from "react";
import { postData } from "@/lib/api";
import { Power, AlertTriangle } from "lucide-react";

interface KillSwitchProps {
  initialState?: boolean;
  onToggle?: (newState: boolean) => void;
}

export function KillSwitch({ initialState = false, onToggle }: KillSwitchProps) {
  const [isActive, setIsActive] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    setLoading(true);
    setError(null);
    try {
      const nextState = !isActive;
      await postData(
        "/admin/kill-switch",
        { enabled: nextState },
        "dev-admin-secret-2026"
      );
      setIsActive(nextState);
      if (onToggle) onToggle(nextState);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to toggle kill switch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="custom-card rounded-2xl p-6 border">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-2xl border ${
              isActive
                ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/40"
                : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
            }`}
          >
            <Power className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Master Compliance Kill Switch
              </h3>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  isActive
                    ? "bg-rose-500 text-white animate-pulse"
                    : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {isActive ? "HALTED (ACTIVE)" : "ENGAGED (AUTONOMOUS)"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rule 1: Instantly halts all outgoing interventions and retries across the entire system.
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={loading}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-md cursor-pointer flex items-center gap-2 ${
            isActive
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-rose-600 hover:bg-rose-700 text-white"
          } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Power className="w-4 h-4" />
          {loading ? "Updating..." : isActive ? "Resume Autonomous Actions" : "HALT ALL INTERVENTIONS"}
        </button>
      </div>

      {error && (
        <div className="mt-3 text-xs text-rose-500 flex items-center gap-1.5 font-medium">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
