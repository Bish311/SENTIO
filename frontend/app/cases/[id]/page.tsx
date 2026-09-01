"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/api";
import { CaseDetail } from "@/lib/types";
import { formatISTDateTime, formatPaiseToRupees } from "@/lib/format";
import { CaseTimeline } from "@/components/case-timeline";
import {
  ArrowLeft,
  User,
  CreditCard,
  Sparkles,
  Award,
} from "lucide-react";

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
        <h2 className="text-lg font-bold text-rose-500">Case Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">
          Could not locate case {resolvedParams.id} on the Spine.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold px-4 py-2 rounded-xl custom-surface"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Command Center
        </Link>
      </div>
    );
  }

  if (!caseDetail) {
    return (
      <div className="py-16 text-center text-xs text-slate-400">
        Loading case details from Spine...
      </div>
    );
  }

  const isRecovered = caseDetail.outcome === "recovered" || caseDetail.state === "settled";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl custom-surface hover:opacity-90 transition-opacity cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white">
                {caseDetail.id}
              </h1>
              <span
                className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isRecovered
                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                }`}
              >
                {caseDetail.state}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Opened: {formatISTDateTime(caseDetail.opened_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl custom-card border text-right">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              {isRecovered ? "Recovered Amount" : "Amount At Risk"}
            </span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">
              {formatPaiseToRupees(
                isRecovered ? caseDetail.recovered_paise : caseDetail.amount_at_risk_paise
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="custom-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-1.5">
            <User className="w-4 h-4 text-sky-500" />
            <span className="text-xs font-semibold uppercase">Customer</span>
          </div>
          <div className="font-mono text-sm font-bold text-slate-900 dark:text-white">
            {caseDetail.customer_id}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {caseDetail.customer_name || "Synthetic Persona (R3)"}
          </div>
        </div>

        <div className="custom-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-1.5">
            <CreditCard className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-semibold uppercase">Subscription</span>
          </div>
          <div className="font-mono text-sm font-bold text-slate-900 dark:text-white">
            {caseDetail.subscription_id}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Kind: {caseDetail.kind}
          </div>
        </div>

        <div className="custom-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold uppercase">Root Cause</span>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white capitalize">
            {caseDetail.root_cause ? caseDetail.root_cause.replace(/_/g, " ") : "Pending Diagnosis"}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Lens Matrix / T1 LLM
          </div>
        </div>

        <div className="custom-card rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-1.5">
            <Award className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold uppercase">Experiment Arm</span>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white uppercase font-mono">
            {caseDetail.arm === "agent" ? "Arm A (Sentio AI)" : "Arm B (Baseline)"}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Batch: {caseDetail.batch_id || "Live"}
          </div>
        </div>
      </div>

      <CaseTimeline events={caseDetail.timeline || []} />
    </div>
  );
}
