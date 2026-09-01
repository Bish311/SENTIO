"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";

interface EventItem {
  id: number;
  ts: string;
  actor: string;
  event_type: string;
  case_id: string | null;
  payload: Record<string, unknown>;
}

const ACTOR_BADGES: Record<string, { bg: string; text: string }> = {
  policy: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
  agent: { bg: "rgba(99,102,241,0.15)", text: "#6366f1" },
  reach: { bg: "rgba(14,165,233,0.15)", text: "#0ea5e9" },
  system: { bg: "rgba(16,185,129,0.15)", text: "#10b981" },
  customer: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b" },
  sim: { bg: "rgba(139,92,246,0.15)", text: "#8b5cf6" },
  admin: { bg: "rgba(236,72,153,0.15)", text: "#ec4899" },
};

export function EventTicker() {
  const { data: events, error } = useSWR<EventItem[]>(
    "/events/recent?limit=25",
    fetcher,
    { refreshInterval: 2000, errorRetryInterval: 5000 }
  );

  return (
    <div className="card p-6 h-full flex flex-col justify-between min-h-[460px]">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Audit Stream
          </h2>
          {events && events.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold" style={{ color: "#10b981" }}>Live 2s</span>
            </div>
          )}
        </div>
        <p className="text-xs font-medium mb-4" style={{ color: "var(--text-muted)" }}>
          Immutable Spine events stream in real-time.
        </p>

        <div className="flex flex-col gap-2 overflow-y-auto max-h-[380px] pr-1">
          {error && (
            <div className="surface p-6 text-center flex flex-col items-center justify-center gap-2 my-auto">
              <div
                className="w-10 h-10 rounded-md flex items-center justify-center text-lg font-bold"
                style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
              >
                ⚡
              </div>
              <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                Backend Offline
              </span>
              <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                Start FastAPI on port 8000 to stream live audit events
              </span>
            </div>
          )}

          {!error && (!events || events.length === 0) && (
            <div className="surface p-6 text-center text-xs font-medium italic my-auto" style={{ color: "var(--text-muted)" }}>
              Waiting for events to be appended to the Spine...
            </div>
          )}

          {events && events.map((ev) => {
            const badge = ACTOR_BADGES[ev.actor] || { bg: "var(--bg-surface)", text: "var(--text-muted)" };
            return (
              <div
                key={ev.id}
                className="surface p-3 flex items-center justify-between gap-3 border transition-colors hover:border-slate-400"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="pill text-[9px] shrink-0"
                    style={{ background: badge.bg, color: badge.text }}
                  >
                    {ev.actor}
                  </span>
                  <span
                    className="text-xs font-mono font-bold truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {ev.event_type}
                  </span>
                </div>
                <span
                  className="text-[10px] font-medium shrink-0"
                  style={{ color: "var(--text-muted)" }}
                >
                  {formatRelativeTime(ev.ts)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="pt-3 border-t text-[11px] font-medium flex items-center justify-between"
        style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
      >
        <span>Append-only Event Store</span>
        <span>SHA-256 HMAC</span>
      </div>
    </div>
  );
}
