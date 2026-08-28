"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Mã lớp để giáo viên đọc/gửi cho học sinh. Bấm để copy. */
export function ClassCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="rise flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface px-4 py-2.5"
    >
      <span className="text-left">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">
          Mã lớp
        </span>
        <span className="tnum font-display text-lg font-extrabold tracking-[0.08em] text-ink">
          {code}
        </span>
      </span>
      {copied ? (
        <Check size={18} className="text-success" />
      ) : (
        <Copy size={18} className="text-muted" />
      )}
      <span className="sr-only">{copied ? "Đã copy mã lớp" : "Copy mã lớp"}</span>
    </button>
  );
}
