import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold [&_svg]:size-3.5",
  {
    variants: {
      tone: {
        brand: "bg-primary-soft text-primary",
        accent: "bg-accent-soft text-[#4c1979]",
        success: "bg-success-soft text-[#199647]",
        danger: "bg-danger-soft text-[#4c1979]",
        info: "bg-info-soft text-[#6f2dbd]",
        neutral: "bg-sunken text-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}

/** Chip môn học — RW xanh, Math cam, để nhìn phát biết loại lớp */
export function SubjectBadge({ subject }: { subject: "rw" | "math" }) {
  return subject === "math" ? (
    <Badge tone="accent">Math</Badge>
  ) : (
    <Badge tone="brand">Reading &amp; Writing</Badge>
  );
}
