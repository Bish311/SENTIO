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
  const getIcon = (type: string) => {
    if (type.includes("payment.failed")) return AlertCircle;
    if (type.includes("paid") || type.includes("captured")) return CheckCircle2;
    if (type.includes("diagnosed") || type.includes("diagnosis")) return Sparkles;
    if (type.includes("policy.allowed")) return ShieldCheck;
    if (type.includes("policy.denied")) return ShieldAlert;
    if (type.includes("link.created")) return LinkIcon;
    if (type.includes("message") || type.includes("reply")) return MessageSquare;
    if (type.includes("ptp")) return CalendarCheck;
    return Clock;
  };

  const getColor = (type: string) => {
    if (type.includes("failed") || type.includes("denied")) return "#dc2626";
    if (type.includes("paid") || type.includes("allowed") || type.includes("captured")) return "#059669";
    if (type.includes("diagnosed") || type.includes("ptp")) return "#0284c7";
    return "#94a3b8";
  };

  if (events.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          No timeline events recorded for this case yet.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5 sm:p-6">
      <h3 className="text-sm font-semibold mb-5" style={{ color: "var(--text-primary)" }}>
        Timeline ({events.length} events)
      </h3>

      <div className="relative ml-3">
        <div
          className="absolute left-0 top-2 bottom-2 w-px"
          style={{ background: "var(--border-color)" }}
        />

        <div className="space-y-4">
          {events.map((event, index) => {
            const Icon = getIcon(event.event_type);
            const color = getColor(event.event_type);
            const receipt = event.payload?.receipt as PolicyReceiptData | undefined;

            return (
              <div key={event.id || index} className="relative pl-6">
                <div
                  className="absolute left-[-5px] top-2.5 w-[10px] h-[10px] rounded-full border-2"
                  style={{ borderColor: color, background: "var(--bg-card)" }}
                />

                <div className="surface p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                      <span className="text-[12px] font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                        {event.event_type}
                      </span>
                      <span className="pill" style={{ background: "var(--bg-card)", color: "var(--text-muted)" }}>
                        {event.actor}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                      {formatISTDateTime(event.ts)}
                    </span>
                  </div>

                  {receipt && (
                    <div className="mt-2">
                      <ReceiptChip receipt={receipt} />
                    </div>
                  )}

                  {event.payload && (
                    <div className="mt-2 text-[11px] space-y-0.5" style={{ color: "var(--text-secondary)" }}>
                      {typeof event.payload.amount_paise === "number" && (
                        <div>Amount: <strong>{formatPaiseToRupees(event.payload.amount_paise)}</strong></div>
                      )}
                      {typeof event.payload.root_cause === "string" && (
                        <div>
                          Cause: <strong style={{ color }}>{event.payload.root_cause}</strong>
                          {" "}(conf: {String(event.payload.confidence || 1.0)})
                        </div>
                      )}
                      {typeof event.payload.promised_date === "string" && (
                        <div>Promise: <strong>{event.payload.promised_date}</strong></div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
