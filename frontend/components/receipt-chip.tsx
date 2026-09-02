"use client";

import { useState } from "react";
import { PolicyReceiptData } from "@/lib/types";
import { formatISTDateTime } from "@/lib/format";
import { ShieldCheck, ShieldAlert, X } from "lucide-react";

interface ReceiptChipProps {
  receipt: PolicyReceiptData;
}

export function ReceiptChip({ receipt }: ReceiptChipProps) {
  const [open, setOpen] = useState(false);
  const isAllow = receipt.verdict.toLowerCase() === "allow";
  const color = isAllow ? "#10b981" : "#ef4444";
  const bg = isAllow ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)";
  const border = isAllow ? "1px solid rgba(16,185,129,0.35)" : "1px solid rgba(239,68,68,0.35)";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider cursor-pointer transition-all hover:scale-[1.02]"
        style={{ background: bg, color, border }}
      >
        {isAllow ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
        {receipt.verdict} RECEIPT
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-lg p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md flex items-center justify-center border" style={{ background: bg, borderColor: color }}>
                  {isAllow ? <ShieldCheck className="w-5 h-5" style={{ color }} /> : <ShieldAlert className="w-5 h-5" style={{ color }} />}
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Policy Engine Receipt</h3>
                  <p className="text-xs font-mono font-medium" style={{ color: "var(--text-muted)" }}>{receipt.receipt_id}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-md cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800" style={{ color: "var(--text-muted)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="surface p-3 border" style={{ borderColor: "var(--border-color)" }}>
                <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Verdict</span>
                <span className="text-base font-extrabold uppercase mt-0.5 block" style={{ color }}>{receipt.verdict}</span>
              </div>
              <div className="surface p-3 border" style={{ borderColor: "var(--border-color)" }}>
                <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: "var(--text-muted)" }}>Evaluated At</span>
                <span className="text-xs font-bold mt-0.5 block font-mono" style={{ color: "var(--text-primary)" }}>{formatISTDateTime(receipt.evaluated_at)}</span>
              </div>
            </div>

            {receipt.violations && receipt.violations.length > 0 && (
              <div className="p-3.5 rounded-md" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <span className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#ef4444" }}>Violations Intercepted</span>
                {receipt.violations.map((v, i) => (
                  <p key={i} className="text-xs font-bold" style={{ color: "#ef4444" }}>
                    • {v.replace(/_/g, " ")}
                  </p>
                ))}
              </div>
            )}

            {receipt.rules_evaluated && receipt.rules_evaluated.length > 0 && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: "var(--text-muted)" }}>Compliance Rules Checked (8 Rules)</span>
                <div className="flex flex-wrap gap-1.5">
                  {receipt.rules_evaluated.map((r, i) => (
                    <span key={i} className="pill font-mono text-[10px]" style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t flex justify-end" style={{ borderColor: "var(--border-color)" }}>
              <button
                onClick={() => setOpen(false)}
                className="px-5 py-2 rounded-md text-xs font-bold uppercase tracking-wider text-white cursor-pointer"
                style={{ background: "var(--accent-purple-strong)" }}
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
