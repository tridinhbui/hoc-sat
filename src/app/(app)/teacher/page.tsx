import Link from "next/link";
import {
  BookOpen,
  ClipboardCheck,
  Clock,
  Users,
  Plus,
  CalendarCheck,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { countMyStudents, listMyClasses } from "@/lib/repo/classes";
import { countDueSoon, countUngradedByClass } from "@/lib/repo/assignments";
import { classesNeedingAttendance } from "@/lib/repo/dashboard";
import { getCalendarFeed } from "@/lib/repo/calendar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { Button } from "@/components/ui/button";
import { Badge, SubjectBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { fmtDateTime } from "@/lib/utils/date";
import { Cu } from "@/components/mascot/cu";

export default async function TeacherHome() {
  const ctx = await requireRole("teacher", "admin");

  const now = new Date();
  const [classes, studentCount, ungradedByClass, dueSoon, needAttendance, upcoming] =
    await Promise.all([
      listMyClasses(ctx),
      countMyStudents(ctx),
      countUngradedByClass(ctx),
      countDueSoon(ctx),
      classesNeedingAttendance(ctx),
      getCalendarFeed(ctx, { from: now, to: new Date(now.getTime() + 7 * 86_400_000) }),
    ]);
  const ungraded = [...ungradedByClass.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1>Chào {ctx.user.name.split(" ").slice(-1)[0]} </h1>
          <p className="text-sm text-muted">Hôm nay lớp mình có gì nào.</p>
        </div>
        <Link href="/teacher/classes/new">
          <Button><Plus /> Tạo lớp</Button>
        </Link>
      </div>

      <div className="bento">
        <StatTile className="col-span-3" label="Lớp đang dạy" value={classes.length} icon={<BookOpen size={16} />} />
        <StatTile className="col-span-3" label="Chưa chấm" value={ungraded} tone="danger" icon={<ClipboardCheck size={16} />} />
        <StatTile className="col-span-3" label="Sắp đến hạn" value={dueSoon} hint="7 ngày tới" tone="accent" icon={<Clock size={16} />} />
        <StatTile className="col-span-3" label="Học sinh" value={studentCount} tone="success" icon={<Users size={16} />} />

        {/* Việc của hôm nay đứng trước mọi thứ khác: điểm danh không làm trong
            buổi thì hôm sau ngồi nhớ lại, và nhớ sai. */}
        {needAttendance.length > 0 && (
          <Card className="col-span-12">
            <CardHeader>
              <CardTitle>Chưa điểm danh hôm nay</CardTitle>
              <Badge tone="accent">{needAttendance.length} lớp</Badge>
            </CardHeader>
            <ul className="flex flex-wrap gap-2">
              {needAttendance.map((c) => (
                <li key={c.id}>
                  <Link href={`/teacher/classes/${c.id}/attendance`}>
                    <Button size="sm" variant="secondary">
                      <CalendarCheck /> {c.name}
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="col-span-7">
          <CardHeader><CardTitle>Lớp của tôi</CardTitle></CardHeader>
          {classes.length === 0 ? (
            <EmptyState
              mascot={<Cu pose="sleep" size={110} />}
              title="Chưa có lớp nào"
              description="Tạo lớp đầu tiên, chọn Reading &amp; Writing hoặc Math rồi gửi mã cho học sinh."
              action={<Link href="/teacher/classes/new"><Button><Plus /> Tạo lớp</Button></Link>}
            />
          ) : (
            <ul className="space-y-2">
              {classes.map((c) => (
                // Hai link cạnh nhau, không lồng nhau: <a> trong <a> là HTML
                // sai và trình duyệt tự tách thẻ, hỏng luôn layout.
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line px-4 py-3"
                >
                  <Link href={`/teacher/classes/${c.id}/stream`} className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{c.name}</span>
                    <span className="tnum text-[13px] text-muted">Mã lớp {c.code}</span>
                  </Link>
                  <Link
                    href={`/teacher/classes/${c.id}/reports`}
                    className="shrink-0 text-[13px] font-semibold text-primary"
                  >
                    Báo cáo
                  </Link>
                  <SubjectBadge subject={c.subject} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="col-span-5">
          <CardHeader><CardTitle>Cần chấm</CardTitle></CardHeader>
          {ungraded === 0 ? (
            <p className="text-sm text-muted">Không còn bài nào chờ chấm. Nhẹ người </p>
          ) : (
            <ul className="space-y-2">
              {classes
                .filter((c) => (ungradedByClass.get(c.id) ?? 0) > 0)
                .map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/teacher/classes/${c.id}/assignments`}
                      className="rise flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line px-4 py-3"
                    >
                      <span className="min-w-0 truncate font-semibold text-ink">{c.name}</span>
                      <Badge tone="danger">{ungradedByClass.get(c.id)} bài</Badge>
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card className="col-span-12">
          <CardHeader>
            <CardTitle>7 ngày tới</CardTitle>
            <Link href="/calendar" className="text-[13px] font-semibold text-primary">
              Xem lịch <ArrowRight className="inline size-3.5" />
            </Link>
          </CardHeader>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">
              Tuần này chưa có buổi học, hạn nộp hay kỳ thi nào trên lịch.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.slice(0, 6).map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line px-4 py-3"
                >
                  <CalendarDays size={18} className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{e.title}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {e.className} · {e.allDay ? "cả ngày" : fmtDateTime(e.startAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
