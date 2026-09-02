"use client";

import { useState } from "react";
import { postData } from "@/lib/api";
import { Power } from "lucide-react";

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
      await postData("/admin/kill-switch", { enabled: nextState }, "dev-admin-secret-2026");
      setIsActive(nextState);
      if (onToggle) onToggle(nextState);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to toggle kill switch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-md flex items-center justify-center shrink-0 border"
            style={{
              background: isActive ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
              borderColor: isActive ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)",
            }}
          >
            <Power className="w-6 h-6" style={{ color: isActive ? "#ef4444" : "#10b981" }} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                Master Compliance Kill Switch
              </h3>
              <span
                className="pill text-[10px]"
                style={{
                  background: isActive ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)",
                  color: isActive ? "#ef4444" : "#10b981",
                  border: isActive ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(16,185,129,0.4)",
                }}
              >
                {isActive ? "HALTED (ACTIVE)" : "ENGAGED (AUTONOMOUS)"}
              </span>
            </div>
            <p className="text-xs font-medium mt-1" style={{ color: "var(--text-secondary)" }}>
              Rule 1: Instantly halts all outgoing interventions and retries across the entire system.
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={loading}
          className="px-5 py-2.5 rounded-md text-xs font-extrabold uppercase tracking-wider text-white cursor-pointer transition-all shadow-sm hover:opacity-90 disabled:opacity-50"
          style={{ background: isActive ? "#10b981" : "#ef4444" }}
        >
          {loading ? "Updating..." : isActive ? "Resume Autonomous Actions" : "HALT ALL INTERVENTIONS"}
        </button>
      </div>

      {error && (
        <p className="text-xs font-bold mt-3" style={{ color: "#ef4444" }}>{error}</p>
      )}
    </div>
  );
}
