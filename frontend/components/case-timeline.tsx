"use client";

import { CaseTimelineEvent, PolicyReceiptData } from "@/lib/types";
import { formatISTDateTime, formatPaiseToRupees } from "@/lib/format";
import { ReceiptChip } from "./receipt-chip";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  Link as LinkIcon,
  CalendarCheck,
} from "lucide-react";

interface CaseTimelineProps {
  events: CaseTimelineEvent[];
}

export function CaseTimeline({ events }: CaseTimelineProps) {
  const getEventIcon = (type: string) => {
    if (type.includes("payment.failed")) return AlertCircle;
    if (type.includes("paid") || type.includes("settled") || type.includes("captured"))
      return CheckCircle2;
    if (type.includes("diagnosed") || type.includes("diagnosis")) return Sparkles;
    if (type.includes("policy.allowed")) return ShieldCheck;
    if (type.includes("policy.denied")) return ShieldAlert;
    if (type.includes("link.created")) return LinkIcon;
    if (type.includes("message") || type.includes("reply")) return MessageSquare;
    if (type.includes("ptp.booked")) return CalendarCheck;
    return Clock;
  };

  const getEventColor = (type: string) => {
    if (type.includes("failed") || type.includes("denied"))
      return "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400";
    if (type.includes("paid") || type.includes("allowed") || type.includes("captured"))
      return "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    if (type.includes("diagnosed") || type.includes("ptp"))
      return "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400";
    return "border-slate-400 bg-slate-400/10 text-slate-600 dark:text-slate-400";
  };

  return (
    <div className="custom-card rounded-2xl p-6">
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
        Audit Trail & State Transitions
      </h3>

      <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {events.map((event, index) => {
          const Icon = getEventIcon(event.event_type);
          const colorClass = getEventColor(event.event_type);
          const receipt = event.payload?.receipt as PolicyReceiptData | undefined;

          return (
            <div key={event.id || index} className="relative group">
              <div
                className={`absolute -left-[30px] top-1 p-1.5 rounded-full border-2 bg-white dark:bg-slate-900 ${colorClass}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>

              <div className="custom-surface rounded-xl p-4 border transition-all hover:border-slate-400 dark:hover:border-slate-600">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {event.event_type}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      actor: {event.actor}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatISTDateTime(event.ts)}
                  </span>
                </div>

                {receipt && (
                  <div className="my-2.5">
                    <ReceiptChip receipt={receipt} />
                  </div>
                )}

                {event.payload && Object.keys(event.payload).length > 0 && (
                  <div className="mt-2 text-xs font-mono p-2.5 rounded-lg bg-slate-950/5 dark:bg-black/40 text-slate-700 dark:text-slate-300 overflow-x-auto">
                    {typeof event.payload.amount_paise === "number" && (
                      <div className="mb-1 text-slate-900 dark:text-white font-semibold">
                        Amount: {formatPaiseToRupees(event.payload.amount_paise)}
                      </div>
                    )}
                    {typeof event.payload.root_cause === "string" && (
                      <div className="mb-1">
                        Root Cause:{" "}
                        <span className="font-bold text-sky-600 dark:text-sky-400">
                          {event.payload.root_cause}
                        </span>{" "}
                        (Confidence: {String(event.payload.confidence || 1.0)})
                      </div>
                    )}
                    {typeof event.payload.quote === "string" && (
                      <div className="italic text-slate-600 dark:text-slate-400">
                        &quot;{event.payload.quote}&quot;
                      </div>
                    )}
                    {typeof event.payload.promised_date === "string" && (
                      <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Promised Date: {event.payload.promised_date}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
