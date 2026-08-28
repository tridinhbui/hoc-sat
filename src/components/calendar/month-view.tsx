import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { buildMonthGrid } from "@/lib/calendar/month";
import type { FeedItem } from "@/lib/calendar/types";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Màu theo loại mục — hạn nộp cam, thi đỏ, buổi học tím. */
export const TYPE_STYLE: Record<string, string> = {
  deadline: "bg-accent-soft text-[#9a6200]",
  midterm: "bg-danger-soft text-[#b32340]",
  final: "bg-danger-soft text-[#b32340]",
  class: "bg-primary-soft text-primary",
  other: "bg-info-soft text-[#0b7ba3]",
};

export function MonthView({ month, items }: { month: string; items: FeedItem[] }) {
  const cells = buildMonthGrid(month);

  const byDate = new Map<string, FeedItem[]>();
  for (const it of items) {
    const list = byDate.get(it.dateKey) ?? [];
    list.push(it);
    byDate.set(it.dateKey, list);
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-soft">
      <div className="grid grid-cols-7 border-b border-line">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="py-2.5 text-center text-[12px] font-semibold uppercase tracking-[0.04em] text-muted"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((c) => {
          const day = byDate.get(c.dateKey) ?? [];
          return (
            <div
              key={c.dateKey}
              className={cn(
                "min-h-[104px] border-b border-r border-line p-1.5 last:border-r-0",
                !c.inMonth && "bg-sunken/60",
              )}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={cn(
                    "tnum grid size-6 place-items-center rounded-full text-[12px] font-semibold",
                    c.isToday && "bg-primary text-white",
                    !c.isToday && c.inMonth && "text-ink",
                    !c.inMonth && "text-muted",
                  )}
                >
                  {c.day}
                </span>
              </div>

              <ul className="space-y-1">
                {day.slice(0, 3).map((it) => {
                  const body = (
                    <span
                      className={cn(
                        "block truncate rounded-[6px] px-1.5 py-1 text-[11px] font-semibold",
                        TYPE_STYLE[it.type] ?? TYPE_STYLE.other,
                      )}
                      title={`${it.title} · ${it.className}`}
                    >
                      {it.title}
                    </span>
                  );
                  return (
                    <li key={it.id}>
                      {it.href ? (
                        <Link href={it.href} className="block">
                          {body}
                        </Link>
                      ) : (
                        body
                      )}
                    </li>
                  );
                })}
                {day.length > 3 && (
                  <li className="px-1.5 text-[11px] font-semibold text-muted">
                    +{day.length - 3} nữa
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
