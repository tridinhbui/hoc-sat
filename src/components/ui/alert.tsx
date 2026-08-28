import { cn } from "@/lib/utils/cn";

export function Alert({ tone = "danger", children }: { tone?: "danger" | "success"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "rounded-[var(--radius-md)] px-3 py-2 text-[13px]",
        tone === "danger" ? "bg-danger-soft text-[#b32340]" : "bg-success-soft text-[#0d7a54]",
      )}
    >
      {children}
    </p>
  );
}
