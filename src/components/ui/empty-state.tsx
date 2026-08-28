import type { ReactNode } from "react";

/**
 * Không bao giờ để một khu vực trống trơn: mascot + 1 dòng microcopy + 1 hành động.
 * Ngoại lệ: không dùng trong phòng thi lockdown.
 */
export function EmptyState({
  mascot,
  title,
  description,
  action,
}: {
  mascot?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {mascot}
      <h3 className="text-[19px]">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
