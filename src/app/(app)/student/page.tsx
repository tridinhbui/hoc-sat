import Link from "next/link";
import { Flame, Plus, Target, CalendarDays, ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { listMyClasses } from "@/lib/repo/classes";
import { listTodoForStudent } from "@/lib/repo/assignments";
import { myAverage, recentGrades, studentStreak } from "@/lib/repo/dashboard";
import { getCalendarFeed } from "@/lib/repo/calendar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { Button } from "@/components/ui/button";
import { Badge, SubjectBadge } from "@/components/ui/badge";
import { fmtDateTime, relativeDue } from "@/lib/utils/date";
import { EmptyState } from "@/components/ui/empty-state";
import { Cu } from "@/components/mascot/cu";

export default async function StudentHome() {
  const ctx = await requireRole("student", "admin");

  const now = new Date();
  const [classes, todo, streak, average, grades, upcoming] = await Promise.all([
    listMyClasses(ctx),
    listTodoForStudent(ctx),
    studentStreak(ctx),
    myAverage(ctx),
    recentGrades(ctx),
    getCalendarFeed(ctx, { from: now, to: new Date(now.getTime() + 7 * 86_400_000) }),
  ]);

  const overdue = todo.filter((t) => t.overdue).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1>Chào {ctx.user.name.split(" ").slice(-1)[0]} 👋</h1>
          <p className="text-sm text-muted">Học một chút hôm nay nhé.</p>
        </div>
        <Link href="/student/join">
          <Button variant="secondary"><Plus /> Vào lớp</Button>
        </Link>
      </div>

      <div className="bento">
        <StatTile
          className="col-span-4"
          label="Chuỗi ngày học"
          value={streak}
          hint={streak === 0 ? "nộp bài hôm nay để bắt đầu" : "ngày liên tiếp có nộp bài"}
          tone="accent"
          icon={<Flame size={16} />}
        />
        <StatTile
          className="col-span-4"
          label="Điểm trung bình"
          value={average === null ? "—" : `${average}%`}
          hint={average === null ? "chưa có bài nào được trả" : "trên các bài đã trả"}
          tone="success"
          icon={<Target size={16} />}
        />
        <StatTile
          className="col-span-4"
          label="Cần nộp"
          value={todo.length}
          hint={overdue > 0 ? `${overdue} bài đã quá hạn` : "chưa có bài nào quá hạn"}
          tone={overdue > 0 ? "danger" : "brand"}
          icon={<Target size={16} />}
        />

        <Card className="col-span-6">
          <CardHeader>
            <CardTitle>Việc cần làm</CardTitle>
            {todo.length > 0 && <Badge tone="accent">{todo.length}</Badge>}
          </CardHeader>
          {todo.length === 0 ? (
            <p className="text-sm text-muted">Không còn bài nào phải nộp. Thảnh thơi 🎉</p>
          ) : (
            <ul className="space-y-2">
              {todo.map((t) => (
                <li key={t.assignmentId}>
                  <Link
                    href={`/student/classes/${t.classId}/assignments/${t.assignmentId}`}
                    className="rise flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line px-4 py-3"
                  >
                    <span className="min-w-0 truncate font-semibold text-ink">{t.title}</span>
                    {t.dueAt && (
                      <Badge tone={t.overdue ? "danger" : "neutral"}>
                        {t.overdue ? "Quá hạn" : relativeDue(t.dueAt)}
                      </Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="col-span-6">
          <CardHeader>
            <CardTitle>Điểm mới trả</CardTitle>
          </CardHeader>
          {grades.length === 0 ? (
            <p className="text-sm text-muted">
              Chưa có bài nào được trả. Điểm sẽ hiện ở đây ngay khi giáo viên chấm xong.
            </p>
          ) : (
            <ul className="space-y-2">
              {grades.map((g) => {
                const p = Math.round((g.grade / g.points) * 100);
                return (
                  <li key={g.assignmentId}>
                    <Link
                      href={`/student/classes/${g.classId}/grades`}
                      className="rise flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line px-4 py-3"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{g.title}</span>
                        <span className="block truncate text-[13px] text-muted">
                          {g.className}
                        </span>
                      </span>
                      <Badge tone={p >= 80 ? "success" : p >= 50 ? "accent" : "danger"}>
                        {g.grade}/{g.points}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="col-span-6">
          <CardHeader><CardTitle>Lớp của tôi</CardTitle></CardHeader>
          {classes.length === 0 ? (
            <EmptyState
              mascot={<Cu pose="sleep" size={110} />}
              title="Chưa vào lớp nào. Cú đang ngủ 💤"
              description="Nhập mã lớp giáo viên cho để vào lớp nhé."
              action={<Link href="/student/join"><Button>Nhập mã lớp</Button></Link>}
            />
          ) : (
            <ul className="space-y-2">
              {classes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/student/classes/${c.id}/stream`}
                    className="rise flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line px-4 py-3"
                  >
                    <span className="truncate font-semibold text-ink">{c.name}</span>
                    <SubjectBadge subject={c.subject} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="col-span-6">
          <CardHeader>
            <CardTitle>7 ngày tới</CardTitle>
            <Link href="/calendar" className="text-[13px] font-semibold text-primary">
              Xem lịch <ArrowRight className="inline size-3.5" />
            </Link>
          </CardHeader>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted">Tuần này chưa có buổi học hay hạn nộp nào.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.slice(0, 5).map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line px-4 py-3">
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
