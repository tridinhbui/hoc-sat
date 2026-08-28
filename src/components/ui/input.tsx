import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-[var(--radius-md)] bg-sunken px-4 text-[15px] text-ink",
        "placeholder:text-muted border border-transparent",
        "focus:bg-surface focus:border-line-strong",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      {children}
      {error ? (
        <span className="block text-[13px] text-danger">{error}</span>
      ) : hint ? (
        <span className="block text-[13px] text-muted">{hint}</span>
      ) : null}
    </label>
  );
}
