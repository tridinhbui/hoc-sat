import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/guard";
import {
  getCalendarFeed,
  listClassesIManage,
  listMyClassOptions,
} from "@/lib/repo/calendar";
import { currentMonth, monthRange, todayKey } from "@/lib/calendar/month";
import { CalendarNav } from "@/components/calendar/calendar-nav";
import { MonthView } from "@/components/calendar/month-view";
import { Agenda } from "@/components/calendar/agenda";
import { EventComposer } from "@/components/calendar/event-composer";

export const metadata: Metadata = { title: "Lịch" };

export default async function CalendarPage({
  searchParams,
}: PageProps<"/calendar">) {
  const ctx = await requireUser();
  const sp = await searchParams;

  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month)
    ? sp.month
    : currentMonth();
  const classId = typeof sp.classId === "string" ? sp.classId : undefined;

  const [items, options, canEdit] = await Promise.all([
    getCalendarFeed(ctx, { ...monthRange(month), classId }),
    listMyClassOptions(ctx),
    // Chỉ giáo viên mới thêm/xoá được mục trên lịch — TA và học sinh chỉ xem.
    listClassesIManage(ctx),
  ]);

  const editable = options.filter((c) => canEdit.has(c.id));

  const today = todayKey();
  const upcoming = items.filter((i) => i.dateKey >= today).slice(0, 30);

  return (
    <div className="space-y-5">
      <Suspense fallback={<div className="h-10" />}>
        <CalendarNav month={month} classId={classId} classes={options} />
      </Suspense>

      {editable.length > 0 && <EventComposer classes={editable} />}

      <MonthView month={month} items={items} />

      <Agenda
        items={upcoming.length > 0 ? upcoming : items}
        canEdit={canEdit}
        title={upcoming.length > 0 ? "Sắp tới" : "Trong tháng"}
      />
    </div>
  );
}
