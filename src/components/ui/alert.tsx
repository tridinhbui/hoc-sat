import { cn } from "@/lib/utils/cn";

export function Alert({
  tone = "danger",
  children,
}: {
  tone?: "danger" | "success" | "info" | "warning";
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "rounded-[var(--radius-md)] px-3 py-2 text-[13px]",
        tone === "danger" && "bg-danger-soft text-[#b32340]",
        tone === "success" && "bg-success-soft text-[#0d7a54]",
        tone === "info" && "bg-info-soft text-[#0b7ba3]",
        tone === "warning" && "bg-accent-soft text-[#9a6200]",
      )}
    >
      {children}
    </p>
  );
}
