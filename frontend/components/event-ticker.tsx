"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { formatRelativeTime } from "@/lib/format";
import { RefreshCw } from "lucide-react";

interface EventItem {
  id: number;
  ts: string;
  actor: string;
  event_type: string;
  case_id: string | null;
  payload: Record<string, unknown>;
}

export function EventTicker() {
  const { data: events, error, mutate } = useSWR<EventItem[]>(
    "/events/recent?limit=25",
    fetcher,
    { refreshInterval: 2000 }
  );

  const getActorBadge = (actor: string) => {
    switch (actor) {
      case "policy":
        return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
      case "agent":
        return "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30";
      case "reach":
        return "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30";
      case "system":
        return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "customer":
        return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="custom-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative" />
          </div>
          <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            Live Spine Audit Ticker
          </h2>
        </div>
        <button
          onClick={() => mutate()}
          aria-label="Refresh events"
          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 p-1 rounded-md transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Syncing 2s</span>
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
        {(!events || events.length === 0) && !error && (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
            Waiting for live events on the Spine...
          </div>
        )}

        {error && (
          <div className="py-6 text-center text-xs text-rose-500">
            Unable to stream events from backend API.
          </div>
        )}

        {events &&
          events.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between p-2.5 rounded-xl custom-surface text-xs hover:bg-white/60 dark:hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border shrink-0 ${getActorBadge(
                    ev.actor
                  )}`}
                >
                  {ev.actor}
                </span>

                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {ev.event_type}
                </span>

                {ev.case_id && (
                  <span className="text-[11px] text-slate-400 font-mono hidden sm:inline truncate">
                    case: {ev.case_id.slice(0, 10)}
                  </span>
                )}
              </div>

              <span className="text-[11px] text-slate-400 font-medium shrink-0 ml-2">
                {formatRelativeTime(ev.ts)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
