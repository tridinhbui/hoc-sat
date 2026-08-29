import Link from "next/link";
import {
  Bell,
  BookOpen,
  CalendarDays,
  Crown,
  FileCheck2,
  GraduationCap,
  History,
  Home,
  LayoutGrid,
  Library,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/sign-out-button";
import type { SessionUser } from "@/lib/auth/guard";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: "HOT" | "NEW";
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const STUDENT_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/student", label: "Trang chủ", icon: Home },
      { href: "/calendar", label: "Lịch học & thi", icon: CalendarDays },
    ],
  },
  {
    title: "HỌC TẬP",
    items: [
      { href: "/student/classes", label: "Khóa học của tôi", icon: BookOpen },
      { href: "/student/join", label: "Vào lớp mới", icon: GraduationCap, badge: "NEW" },
    ],
  },
  {
    title: "LUYỆN TẬP SAT",
    items: [
      { href: "/student", label: "Thi thử (Mock Test)", icon: FileCheck2, badge: "HOT" },
      { href: "/student/classes", label: "Kho bài tập & Quiz", icon: Library, badge: "HOT" },
      { href: "/student", label: "Sổ câu sai", icon: History },
    ],
  },
  {
    title: "CỘNG ĐỒNG",
    items: [
      { href: "/student", label: "Bảng xếp hạng", icon: Trophy, badge: "NEW" },
      { href: "/student", label: "Thử thách cùng bạn", icon: Swords },
    ],
  },
];

const TEACHER_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/teacher", label: "Tổng quan", icon: Home },
      { href: "/calendar", label: "Lịch giảng dạy", icon: CalendarDays },
    ],
  },
  {
    title: "QUẢN LÝ",
    items: [
      { href: "/teacher", label: "Lớp học phụ trách", icon: LayoutGrid },
      { href: "/teacher/classes/new", label: "Tạo lớp mới", icon: GraduationCap, badge: "NEW" },
    ],
  },
];

const TA_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/ta", label: "Tổng quan", icon: Home },
      { href: "/calendar", label: "Lịch trợ giảng", icon: CalendarDays },
    ],
  },
  {
    title: "LỚP HỌC",
    items: [{ href: "/ta", label: "Danh sách lớp", icon: LayoutGrid }],
  },
];

const ADMIN_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/admin/users", label: "Tài khoản người dùng", icon: Users, badge: "HOT" },
      { href: "/calendar", label: "Lịch toàn trung tâm", icon: CalendarDays },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  teacher: "Giáo viên",
  ta: "Trợ giảng",
  student: "Học sinh",
};

export function AppShell({
  user,
  streak = 3,
  children,
}: {
  user: SessionUser;
  streak?: number;
  children: React.ReactNode;
}) {
  const sections =
    user.role === "admin"
      ? ADMIN_SECTIONS
      : user.role === "teacher"
        ? TEACHER_SECTIONS
        : user.role === "ta"
          ? TA_SECTIONS
          : STUDENT_SECTIONS;

  return (
    <div className="flex min-h-dvh bg-bg">
      {/* -------------------------------------------------------------
          SIDEBAR (Desktop) — Phong cách Lumist.ai
          ------------------------------------------------------------- */}
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-line bg-surface px-4 py-5 md:flex">
        {/* Logo brand */}
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xs">
              <Sparkles size={19} />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-lg font-black tracking-tight text-ink">
                HocSAT<span className="text-primary">.ai</span>
              </span>
            </div>
          </Link>
        </div>

        {/* SAT / ACT / AP Pill Switcher giống Lumist (ảnh 1 & 2) */}
        <div className="mt-5 flex items-center gap-1.5 rounded-full bg-sunken p-1">
          <button
            type="button"
            className="flex-1 rounded-full bg-primary py-1.5 text-center text-xs font-bold text-white shadow-xs"
          >
            SAT
          </button>
          <button
            type="button"
            className="flex-1 rounded-full py-1.5 text-center text-xs font-semibold text-muted hover:text-ink"
          >
            ACT
          </button>
          <button
            type="button"
            className="flex-1 rounded-full py-1.5 text-center text-xs font-semibold text-muted hover:text-ink"
          >
            AP
          </button>
        </div>

        {/* Navigation Categories */}
        <nav className="mt-6 flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
          {sections.map((section, idx) => (
            <div key={section.title ?? `sec-${idx}`} className="flex flex-col gap-1">
              {section.title && (
                <span className="px-3 text-[11px] font-bold tracking-wider text-muted/80">
                  {section.title}
                </span>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label + item.href}
                    href={item.href}
                    className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-body transition-colors hover:bg-primary-soft hover:text-primary"
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        size={18}
                        className="text-muted/80 transition-colors group-hover:text-primary"
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={
                          item.badge === "HOT"
                            ? "rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-extrabold text-blue-600"
                            : "rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-600"
                        }
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Card Bottom (giống avatar profile card góc dưới bên trái của Lumist) */}
        <div className="mt-auto border-t border-line pt-4">
          <div className="flex items-center justify-between rounded-xl bg-sunken/70 p-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar name={user.name} size={36} className="border-2 border-white shadow-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-ink">{user.name}</p>
                <p className="truncate text-[11px] font-medium text-muted">
                  {user.email.split("@")[0]} · {ROLE_LABEL[user.role]}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <SignOutButton variant="icon" />
            </div>
          </div>
        </div>
      </aside>

      {/* -------------------------------------------------------------
          MAIN CONTENT WRAPPER WITH TOP HEADER
          ------------------------------------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header Bar trên Desktop — Phong cách Lumist */}
        <header className="hidden h-16 items-center justify-between border-b border-line bg-surface px-8 md:flex">
          {/* Trạng thái ngày thi */}
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <CalendarDays size={16} className="text-primary" />
            <span>Kỳ thi Digital SAT mục tiêu:</span>
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 font-bold text-primary">
              Tháng 10/2026 (Còn 42 ngày)
            </span>
          </div>

          {/* Gamification Counters: Kim cương, Xu, Chuông thông báo & Upgrade Pill */}
          <div className="flex items-center gap-4">
            {/* Lửa streak */}
            <div className="flex items-center gap-1.5 rounded-full bg-sunken px-3 py-1 text-xs font-bold text-orange-600">
              <span className="text-sm">🔥</span>
              <span className="tnum">{streak}</span>
            </div>

            {/* Kim cương */}
            <div className="flex items-center gap-1.5 rounded-full bg-sunken px-3 py-1 text-xs font-bold text-sky-600">
              <span className="text-sm">💎</span>
              <span className="tnum">12</span>
            </div>

            {/* Xu vàng */}
            <div className="flex items-center gap-1.5 rounded-full bg-sunken px-3 py-1 text-xs font-bold text-amber-600">
              <span className="text-sm">🪙</span>
              <span className="tnum">75</span>
            </div>

            {/* Chuông thông báo */}
            <button
              type="button"
              className="relative grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink"
              title="Thông báo"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-rose-500 ring-2 ring-surface" />
            </button>

            {/* Upgrade / Luyện thi Button với Gradient phong cách Lumist */}
            <Link
              href="/calendar"
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-opacity hover:opacity-90"
            >
              <Crown size={14} />
              <span>Nâng mục tiêu 1500+</span>
            </Link>
          </div>
        </header>

        {/* Header Mobile */}
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-1.5">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-white">
              <Sparkles size={15} />
            </span>
            <span className="font-display text-base font-extrabold text-ink">HocSAT</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs font-bold text-amber-600">
              <span>🪙</span>
              <span className="tnum">75</span>
            </div>
            <Avatar name={user.name} size={30} />
            <SignOutButton variant="icon" />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 px-4 py-6 pb-24 md:px-8 md:py-8">
          <div className="fade-up mx-auto max-w-[1240px]">{children}</div>
        </main>

        {/* Tab bar — Mobile Navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-surface/95 py-2 backdrop-blur-md md:hidden">
          <Link
            href={user.role === "student" ? "/student" : user.role === "teacher" ? "/teacher" : "/dashboard"}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-primary"
          >
            <Home size={20} />
            <span className="text-[10px] font-bold">Trang chủ</span>
          </Link>
          <Link
            href={user.role === "student" ? "/student/classes" : "/teacher"}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted"
          >
            <BookOpen size={20} />
            <span className="text-[10px] font-semibold">Khóa học</span>
          </Link>
          <Link href="/calendar" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted">
            <CalendarDays size={20} />
            <span className="text-[10px] font-semibold">Lịch thi</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
