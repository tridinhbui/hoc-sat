import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Info, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { listMyClasses } from "@/lib/repo/classes";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubjectBadge } from "@/components/ui/badge";
import { MathCourseIllustration, VerbalCourseIllustration } from "@/components/mascot/course-illustrations";

export default async function StudentClassesPage() {
  const ctx = await requireRole("student", "admin");
  const enrolledClasses = await listMyClasses(ctx);

  const mathClasses = enrolledClasses.filter((c) => c.subject === "math");
  const rwClasses = enrolledClasses.filter((c) => c.subject === "rw");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black tracking-tight text-ink">
            Khóa học (Courses)
          </h1>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted">
            <span>Các lộ trình luyện thi SAT đã đăng ký</span>
            <Info size={14} className="text-muted/80" />
          </div>
        </div>

        <Link href="/student/join">
          <Button variant="secondary" className="rounded-full">
            <Plus size={16} /> Nhập mã vào lớp mới
          </Button>
        </Link>
      </div>

      {/* -------------------------------------------------------------
          GRID KHÓA HỌC PHONG CÁCH LUMIST.AI (ảnh 3)
          ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Khóa SAT Math */}
        <Card className="overflow-hidden rounded-[var(--radius-xl)] border-line/80 bg-surface shadow-soft transition-all hover:shadow-soft-md">
          <MathCourseIllustration />

          <div className="space-y-4 p-6">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">
                Luyện thi Toàn diện: SAT Math
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Toàn bộ đại số (Algebra), hình học (Geometry) và giải quyết vấn đề (Problem-solving)
                bám sát đề thi Digital SAT thực chiến.
              </p>
            </div>

            {/* Thống kê nội dung */}
            <div className="flex items-center gap-5 text-xs font-semibold text-muted">
              <span className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-primary" /> 20 Chủ đề bài giảng
              </span>
              <span className="flex items-center gap-1.5">
                <GraduationCap size={14} className="text-primary" /> 40 Bài đánh giá & Test
              </span>
            </div>

            {/* Tiến độ hoàn thành */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-muted">Tiến độ khóa học</span>
                <span className="text-primary">15%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-sunken">
                <div className="h-full w-[15%] rounded-full bg-primary" />
              </div>
            </div>

            {/* Nút bắt đầu học */}
            <div className="pt-2">
              {mathClasses[0] ? (
                <Link href={`/student/classes/${mathClasses[0].id}/stream`}>
                  <Button className="w-full rounded-full bg-primary py-2.5 font-bold shadow-xs hover:bg-primary-hover">
                    Vào học ngay (Start) <ArrowRight size={16} />
                  </Button>
                </Link>
              ) : enrolledClasses[0] ? (
                <Link href={`/student/classes/${enrolledClasses[0].id}/stream`}>
                  <Button className="w-full rounded-full bg-primary py-2.5 font-bold shadow-xs hover:bg-primary-hover">
                    Bắt đầu học (Start) <ArrowRight size={16} />
                  </Button>
                </Link>
              ) : (
                <Link href="/student/join">
                  <Button className="w-full rounded-full bg-primary py-2.5 font-bold shadow-xs hover:bg-primary-hover">
                    Nhập mã lớp Math
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </Card>

        {/* Khóa SAT Verbal */}
        <Card className="overflow-hidden rounded-[var(--radius-xl)] border-line/80 bg-surface shadow-soft transition-all hover:shadow-soft-md">
          <VerbalCourseIllustration />

          <div className="space-y-4 p-6">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">
                Luyện thi Toàn diện: SAT Verbal (Reading & Writing)
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Chiến thuật đọc hiểu chuyên sâu, ngữ pháp thực hành và vốn từ vựng học thuật quan
                trọng trong Digital SAT.
              </p>
            </div>

            {/* Thống kê nội dung */}
            <div className="flex items-center gap-5 text-xs font-semibold text-muted">
              <span className="flex items-center gap-1.5">
                <BookOpen size={14} className="text-danger" /> 39 Chủ đề bài giảng
              </span>
              <span className="flex items-center gap-1.5">
                <GraduationCap size={14} className="text-danger" /> 38 Bài đánh giá & Test
              </span>
            </div>

            {/* Tiến độ hoàn thành */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-muted">Tiến độ khóa học</span>
                <span className="text-danger">28%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-sunken">
                <div className="h-full w-[28%] rounded-full bg-danger" />
              </div>
            </div>

            {/* Nút bắt đầu học */}
            <div className="pt-2">
              {rwClasses[0] ? (
                <Link href={`/student/classes/${rwClasses[0].id}/stream`}>
                  <Button className="w-full rounded-full bg-primary py-2.5 font-bold shadow-xs hover:bg-primary-hover">
                    Vào học ngay (Start) <ArrowRight size={16} />
                  </Button>
                </Link>
              ) : enrolledClasses[0] ? (
                <Link href={`/student/classes/${enrolledClasses[0].id}/stream`}>
                  <Button className="w-full rounded-full bg-primary py-2.5 font-bold shadow-xs hover:bg-primary-hover">
                    Bắt đầu học (Start) <ArrowRight size={16} />
                  </Button>
                </Link>
              ) : (
                <Link href="/student/join">
                  <Button className="w-full rounded-full bg-primary py-2.5 font-bold shadow-xs hover:bg-primary-hover">
                    Nhập mã lớp Verbal
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Danh sách các lớp học đang tham gia cụ thể */}
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-bold text-ink">Các lớp học trung tâm của bạn</h2>
        {enrolledClasses.length === 0 ? (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center">
            <p className="text-sm text-muted">Bạn chưa tham gia lớp học nào.</p>
            <Link href="/student/join" className="mt-3 inline-block">
              <Button size="sm">Nhập mã vào lớp</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrolledClasses.map((c) => (
              <Link
                key={c.id}
                href={`/student/classes/${c.id}/stream`}
                className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-5 transition-all hover:border-primary hover:shadow-soft"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <SubjectBadge subject={c.subject} />
                    <span className="font-mono text-xs font-bold text-muted">#{c.code}</span>
                  </div>
                  <h3 className="mt-3 font-display text-base font-bold text-ink group-hover:text-primary">
                    {c.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    Lớp luyện thi Digital SAT · Đang hoạt động
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-xs font-bold text-primary">
                  <span>Vào không gian lớp</span>
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
