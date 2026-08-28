"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthLabel, shiftMonth, currentMonth } from "@/lib/calendar/month";

export function CalendarNav({
  month,
  classId,
  classes,
}: {
  month: string;
  classId?: string;
  classes: { id: string; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const href = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    }
    return `/calendar?${next.toString()}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1">
        <Link href={href({ month: shiftMonth(month, -1) })} aria-label="Tháng trước">
          <Button variant="ghost" size="icon">
            <ChevronLeft />
          </Button>
        </Link>
        <h1 className="min-w-[160px] text-center text-[22px]">{monthLabel(month)}</h1>
        <Link href={href({ month: shiftMonth(month, 1) })} aria-label="Tháng sau">
          <Button variant="ghost" size="icon">
            <ChevronRight />
          </Button>
        </Link>
      </div>

      {month !== currentMonth() && (
        <Link href={href({ month: currentMonth() })}>
          <Button variant="secondary" size="sm">
            Hôm nay
          </Button>
        </Link>
      )}

      {classes.length > 1 && (
        <select
          value={classId ?? ""}
          onChange={(e) => router.push(href({ classId: e.target.value || undefined }))}
          className="ml-auto h-10 rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold text-ink"
        >
          <option value="">Tất cả lớp</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
