import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Ô số liệu của bento grid. Màu chỉ để phân nhóm ý nghĩa, không trang trí. */
export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "brand",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "brand" | "accent" | "success" | "danger";
  className?: string;
}) {
  const tones = {
    brand: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-[#4c1979]",
    success: "bg-success-soft text-[#199647]",
    danger: "bg-danger-soft text-[#4c1979]",
  } as const;

  return (
    <div
      className={cn(
        "bg-surface border border-line rounded-[var(--radius-lg)] shadow-soft p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">
          {label}
        </span>
        {icon && (
          <span className={cn("grid size-8 place-items-center rounded-full", tones[tone])}>
            {icon}
          </span>
        )}
      </div>
      <div className="font-display tnum mt-2 text-[32px] font-extrabold leading-none text-ink">
        {value}
      </div>
      {hint && <p className="mt-1 text-[13px] text-muted">{hint}</p>}
    </div>
  );
}
