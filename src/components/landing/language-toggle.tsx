"use client";

import { LOCALES, LOCALE_LABEL, type Locale } from "@/lib/landing/content";
import { cn } from "@/lib/utils/cn";

/**
 * Hai nút thật trong một `radiogroup`, không phải <select> giả.
 * Người dùng bàn phím đi tới bằng Tab rồi chọn bằng mũi tên — hành vi
 * mặc định của radio, không cần tự cài phím.
 */
export function LanguageToggle({
  value,
  onChange,
  label,
}: {
  value: Locale;
  onChange: (l: Locale) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="bg-sunken border-line inline-flex items-center gap-0.5 rounded-full border p-0.5"
    >
      {LOCALES.map((l) => {
        const active = l === value;
        return (
          <button
            key={l}
            role="radio"
            aria-checked={active}
            aria-label={LOCALE_LABEL[l]}
            onClick={() => onChange(l)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold uppercase transition-colors",
              active ? "bg-surface text-primary shadow-soft-sm" : "text-muted hover:text-body",
            )}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
