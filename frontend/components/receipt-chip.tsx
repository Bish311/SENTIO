"use client";

import { useState } from "react";
import { PolicyReceiptData } from "@/lib/types";
import { formatISTDateTime } from "@/lib/format";
import { ShieldCheck, ShieldAlert, X } from "lucide-react";

interface ReceiptChipProps {
  receipt: PolicyReceiptData;
}

export function ReceiptChip({ receipt }: ReceiptChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isAllow = receipt.verdict.toLowerCase() === "allow";

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-transform hover:scale-105 cursor-pointer ${
          isAllow
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
            : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40"
        }`}
      >
        {isAllow ? (
          <ShieldCheck className="w-3.5 h-3.5" />
        ) : (
          <ShieldAlert className="w-3.5 h-3.5" />
        )}
        <span className="uppercase tracking-wider">
          {receipt.verdict} RECEIPT
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="custom-card w-full max-w-lg rounded-2xl p-6 shadow-2xl border flex flex-col gap-4 relative animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-xl border ${
                    isAllow
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                  }`}
                >
                  {isAllow ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Policy Engine Receipt
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    {receipt.receipt_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl custom-surface">
                <span className="text-[10px] uppercase font-semibold text-slate-400">
                  Verdict
                </span>
                <div
                  className={`text-sm font-extrabold uppercase mt-0.5 ${
                    isAllow ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {receipt.verdict}
                </div>
              </div>

              <div className="p-2.5 rounded-xl custom-surface">
                <span className="text-[10px] uppercase font-semibold text-slate-400">
                  Evaluated At
                </span>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {formatISTDateTime(receipt.evaluated_at)}
                </div>
              </div>
            </div>

            {receipt.violations && receipt.violations.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                <span className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider text-[10px]">
                  Detected Policy Violations:
                </span>
                <ul className="mt-1 list-disc list-inside text-rose-700 dark:text-rose-300 font-medium space-y-0.5">
                  {receipt.violations.map((v, i) => (
                    <li key={i}>{v.replace(/_/g, " ")}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">
                Evaluated Compliance Rules (8 Rules):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {receipt.rules_evaluated?.map((rule, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2 py-0.5 rounded-md custom-surface text-slate-700 dark:text-slate-300 font-mono"
                  >
                    {rule}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-inherit flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
