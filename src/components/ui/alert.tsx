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
        tone === "danger" && "bg-danger-soft text-[#4c1979]",
        tone === "success" && "bg-success-soft text-[#199647]",
        tone === "info" && "bg-info-soft text-[#6f2dbd]",
        tone === "warning" && "bg-accent-soft text-[#4c1979]",
      )}
    >
      {children}
    </p>
  );
}
