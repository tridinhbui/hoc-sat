import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Lock,
  Plus,
  Zap,
} from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { listMyClasses } from "@/lib/repo/classes";
import { listTodoForStudent } from "@/lib/repo/assignments";
import { myAverage, recentGrades, studentStreak } from "@/lib/repo/dashboard";
import { getCalendarFeed } from "@/lib/repo/calendar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { relativeDue } from "@/lib/utils/date";
import { MockTestIllustration } from "@/components/mascot/lumi";

const WEEKDAYS = [
  { label: "CN", active: false },
  { label: "T2", active: true },
  { label: "T3", active: true },
  { label: "T4", active: true },
  { label: "T5", active: false },
  { label: "T6", active: false, today: true },
  { label: "T7", active: false },
];

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
  const firstClassId = classes[0]?.id;

  return (
    <div className="space-y-6">
      {/* -------------------------------------------------------------
          GREETING & QUICK ACTION HEADER
          ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
            Chào {ctx.user.name.split(" ").slice(-1)[0]} 
          </h1>
          <p className="mt-1 text-sm font-medium text-muted">
            Mục tiêu Digital SAT hôm nay: trả lời đúng 5 câu & giữ chuỗi ngày học.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/student/join">
            <Button variant="secondary" className="rounded-full shadow-2xs">
              <Plus size={16} /> Nhập mã vào lớp
            </Button>
          </Link>
          {firstClassId && (
            <Link href={`/student/classes/${firstClassId}/stream`}>
              <Button className="rounded-full bg-primary shadow-xs hover:bg-primary-hover">
                Vào lớp học ngay <ArrowRight size={16} />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------
          MAIN 2-COLUMN LAYOUT PHONG CÁCH LUMIST.AI (ảnh 2)
          ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* =========================================================
            CỘT TRÁI (4.5/12): STREAK, MỜI BẠN, MỤC TIÊU & TỪ VỰNG
            ========================================================= */}
        <div className="space-y-5 lg:col-span-5">
          {/* 1. Thẻ Streak Lửa 7 ngày (giống ảnh 2) */}
          <Card className="rounded-[var(--radius-lg)] border-line/80 p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-display text-4xl font-black text-ink">{streak}</span>
                <span className="text-3xl"></span>
              </div>
              <Badge tone="accent" className="rounded-full font-bold">
                Giữ lửa học tập
              </Badge>
            </div>

            <p className="mt-2 text-sm font-semibold text-body">
              Làm thêm <span className="font-bold text-primary underline">5 câu hỏi</span> để thắp
              sáng chuỗi ngày học hôm nay.
            </p>

            {/* Hàng 7 ngày trong tuần */}
            <div className="mt-4 flex items-center justify-between gap-1 border-t border-line/60 pt-4">
              {WEEKDAYS.map((day, idx) => (
                <div key={day.label + idx} className="flex flex-col items-center gap-1.5">
                  <div
                    className={
                      day.today
                        ? "grid size-8 place-items-center rounded-full border-2 border-dashed border-accent text-accent-warm shadow-xs"
                        : day.active
                          ? "grid size-8 place-items-center rounded-full bg-accent-soft text-accent-warm shadow-xs"
                          : "grid size-8 place-items-center rounded-full bg-sunken text-muted/60"
                    }
                  >
                    <Zap size={14} className={day.active || day.today ? "fill-current" : ""} />
                  </div>
                  <span className="text-[11px] font-bold text-muted">{day.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* 4. Thẻ Từ vựng trong ngày — Word of the day (giống ảnh 2) */}
          <Card className="rounded-[var(--radius-lg)] border-line/80 p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider text-muted uppercase">
                Từ vựng SAT hôm nay
              </span>
              <button
                type="button"
                className="text-xs font-semibold text-primary transition-colors hover:underline"
              >
                Lưu từ vựng
              </button>
            </div>

            <div className="mt-4 flex flex-col items-center justify-center py-2 text-center">
              <span className="font-display text-3xl font-black text-ink">ubiquitous</span>
              <span className="mt-1 text-xs italic text-muted">/juːˈbɪk.wə.təs/ (adjective)</span>
              <p className="mt-2 text-xs font-medium text-body">
                Xuất hiện ở khắp mọi nơi, phổ biến rộng rãi. Rất thường gặp trong phần Reading &
                Writing.
              </p>
            </div>
          </Card>
        </div>

        {/* =========================================================
            CỘT PHẢI (7.5/12): HERO MOCK TEST, KHÓA HỌC, VIỆC CẦN NỘP
            ========================================================= */}
        <div className="space-y-5 lg:col-span-7">
          {/* 1. Segmented Switcher Pills (Mock Test | Daily Tasks | Courses) */}
          <div className="flex items-center gap-1.5 rounded-full bg-sunken p-1.5">
            <button
              type="button"
              className="flex-1 rounded-full bg-primary py-2 text-center text-xs font-bold text-white shadow-xs"
            >
              Thi thử (Mock Test)
            </button>
            <button
              type="button"
              className="flex-1 rounded-full py-2 text-center text-xs font-semibold text-muted hover:text-ink"
            >
              Nhiệm vụ hôm nay
            </button>
            <Link
              href="/student/classes"
              className="flex-1 rounded-full py-2 text-center text-xs font-semibold text-muted hover:text-ink"
            >
              Khóa học của tôi
            </Link>
          </div>

          {/* 2. Hero Mock Test Card (giống trung tâm ảnh 2) */}
          <Card className="relative overflow-hidden rounded-[var(--radius-xl)] border-line/80 bg-white p-6 shadow-soft md:p-8">
            <div className="text-center">
              <h2 className="font-display text-2xl font-black text-ink md:text-3xl">
                Mock Test Chuẩn Digital SAT®
              </h2>
              <p className="mt-1.5 text-xs text-muted md:text-sm">
                Đúng định dạng College Board: 2 Module Math (35p/22c) & 2 Module Reading & Writing
                (32p/27c).
              </p>
            </div>

            {/* Minh họa 3D Clipboard lớn ở giữa */}
            <div className="my-6 flex justify-center">
              <MockTestIllustration size={170} />
            </div>

            {/* Thanh thông báo khoá tính năng */}
            <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-xl bg-sunken/80 px-4 py-2.5 text-xs font-semibold text-body">
              <Lock size={15} className="text-primary" />
              <span>Hoàn thành bài Mock Test để mở khoá phân tích điểm yếu AI</span>
            </div>

            {/* Nút to màu xanh hoàng gia (Royal Blue) nổi bật */}
            <div className="mt-6 flex justify-center">
              {firstClassId ? (
                <Link href={`/student/classes/${firstClassId}/exams`} className="w-full max-w-sm">
                  <button
                    type="button"
                    className="w-full rounded-full bg-primary py-3.5 text-center text-sm font-black text-white shadow-md transition-transform hover:bg-primary-hover hover:shadow-lg active:scale-[0.99]"
                  >
                    Bắt đầu thi thử ngay (Take Mock Test)
                  </button>
                </Link>
              ) : (
                <Link href="/student/join" className="w-full max-w-sm">
                  <button
                    type="button"
                    className="w-full rounded-full bg-primary py-3.5 text-center text-sm font-black text-white shadow-md transition-transform hover:bg-primary-hover hover:shadow-lg active:scale-[0.99]"
                  >
                    Vào lớp để nhận đề thi
                  </button>
                </Link>
              )}
            </div>
          </Card>

          {/* 4. Danh sách Việc cần làm (Assignments Todo) */}
          <Card className="rounded-[var(--radius-lg)] border-line/80 p-5 shadow-soft">
            <CardHeader className="flex items-center justify-between p-0 pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-ink">Bài tập cần nộp</CardTitle>
                {todo.length > 0 && (
                  <Badge tone="brand" className="rounded-full">
                    {todo.length}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-semibold text-muted">
                {overdue > 0 ? `${overdue} bài trễ hạn` : "Đúng tiến độ"}
              </span>
            </CardHeader>

            {todo.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl bg-sunken/60 p-4 text-xs font-medium text-muted">
                <CheckCircle2 size={18} className="text-success" />
                <span>Không còn bài nào cần nộp. Tuyệt vời </span>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {todo.slice(0, 4).map((t) => (
                  <li key={t.assignmentId}>
                    <Link
                      href={`/student/classes/${t.classId}/assignments/${t.assignmentId}`}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3.5 transition-all hover:border-primary hover:shadow-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-ink group-hover:text-primary">
                          {t.title}
                        </span>
                        <span className="block text-xs text-muted">
                          {classes.find((c) => c.id === t.classId)?.name ?? "Lớp luyện thi"}
                        </span>
                      </div>
                      {t.dueAt && (
                        <Badge tone={t.overdue ? "danger" : "neutral"} className="rounded-full">
                          {t.overdue ? "Quá hạn" : relativeDue(t.dueAt)}
                        </Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* 5. Điểm số bài thi mới trả & Lịch sắp tới */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Điểm mới trả */}
            <Card className="rounded-[var(--radius-lg)] border-line/80 p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-wider text-muted uppercase">
                  Điểm mới trả
                </h3>
                {average !== null && (
                  <span className="text-xs font-bold text-success">
                    TB: {average}%
                  </span>
                )}
              </div>

              {grades.length === 0 ? (
                <p className="mt-3 text-xs text-muted">Chưa có bài nào được trả điểm.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {grades.slice(0, 3).map((g) => {
                    const p = Math.round((g.grade / g.points) * 100);
                    return (
                      <li key={g.assignmentId} className="flex items-center justify-between text-xs">
                        <span className="truncate font-semibold text-ink max-w-[140px]">{g.title}</span>
                        <Badge tone={p >= 80 ? "success" : p >= 50 ? "accent" : "danger"} className="rounded-full">
                          {g.grade}/{g.points}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {/* Lịch 7 ngày tới */}
            <Card className="rounded-[var(--radius-lg)] border-line/80 p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-wider text-muted uppercase">
                  7 ngày tới
                </h3>
                <Link href="/calendar" className="text-xs font-bold text-primary hover:underline">
                  Xem lịch
                </Link>
              </div>

              {upcoming.length === 0 ? (
                <p className="mt-3 text-xs text-muted">Không có lịch trong tuần này.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {upcoming.slice(0, 3).map((e) => (
                    <li key={e.id} className="flex items-center gap-2 text-xs">
                      <CalendarDays size={14} className="text-muted shrink-0" />
                      <span className="truncate font-semibold text-ink">{e.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
