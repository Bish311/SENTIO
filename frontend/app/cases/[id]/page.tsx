"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { CaseDetail } from "@/lib/types";
import { formatISTDateTime, formatPaiseToRupees } from "@/lib/format";
import { CaseTimeline } from "@/components/case-timeline";
import { ArrowLeft } from "lucide-react";

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { data: caseDetail, error } = useSWR<CaseDetail>(
    `/cases/${resolvedParams.id}`,
    fetcher,
    { refreshInterval: 3000 }
  );

  if (error) {
    return (
      <div className="py-16 text-center">
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Case Not Found</h2>
        <p className="text-xs font-medium mt-1" style={{ color: "var(--text-muted)" }}>
          Could not locate case {resolvedParams.id} on the Spine.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold px-4 py-2 rounded-md surface border"
          style={{ borderColor: "var(--border-color)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Command Center
        </Link>
      </div>
    );
  }

  if (!caseDetail) {
    return (
      <div className="py-16 text-center text-xs font-medium" style={{ color: "var(--text-muted)" }}>
        Loading case details from Spine...
      </div>
    );
  }

  const isRecovered = caseDetail.outcome === "recovered" || caseDetail.state === "settled";

  const infoItems = [
    { label: "Customer ID", value: caseDetail.customer_id },
    { label: "Subscription ID", value: caseDetail.subscription_id },
    { label: "Root Cause", value: caseDetail.root_cause ? caseDetail.root_cause.replace(/_/g, " ") : "Pending Diagnosis" },
    { label: "Experiment Arm", value: caseDetail.arm === "agent" ? "Arm A (Sentio AI)" : "Arm B (Baseline)" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b" style={{ borderColor: "var(--border-color)" }}>
        <div className="flex items-center gap-3.5">
          <Link
            href="/"
            className="w-9 h-9 rounded-md flex items-center justify-center surface border hover:opacity-90"
            style={{ borderColor: "var(--border-color)" }}
          >
            <ArrowLeft className="w-4 h-4" style={{ color: "var(--text-primary)" }} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-bold font-mono" style={{ color: "var(--text-primary)" }}>
                {caseDetail.id}
              </h1>
              <span
                className="pill text-xs"
                style={{
                  background: isRecovered ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                  color: isRecovered ? "#10b981" : "#f59e0b",
                  border: isRecovered ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(245,158,11,0.3)",
                }}
              >
                {caseDetail.state}
              </span>
            </div>
            <p className="text-xs font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
              Opened {formatISTDateTime(caseDetail.opened_at)}
            </p>
          </div>
        </div>

        <div className="card px-5 py-3 text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>
            {isRecovered ? "Recovered Amount" : "Amount At Risk"}
          </span>
          <span className="text-xl font-extrabold font-mono" style={{ color: isRecovered ? "#10b981" : "var(--text-primary)" }}>
            {formatPaiseToRupees(isRecovered ? caseDetail.recovered_paise : caseDetail.amount_at_risk_paise)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {infoItems.map((item) => (
          <div key={item.label} className="card p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: "var(--text-muted)" }}>
              {item.label}
            </span>
            <span className="text-sm font-bold block truncate capitalize font-mono" style={{ color: "var(--text-primary)" }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <CaseTimeline events={caseDetail.timeline || []} />
    </div>
  );
}
