import Link from "next/link";
import { CalendarDays, GraduationCap, Home, Users, Flame } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/sign-out-button";
import type { SessionUser } from "@/lib/auth/guard";

const NAV: Record<string, { href: string; label: string; icon: typeof Home }[]> = {
  admin: [
    { href: "/admin/users", label: "Tài khoản", icon: Users },
    { href: "/calendar", label: "Lịch", icon: CalendarDays },
  ],
  teacher: [
    { href: "/teacher", label: "Trang chủ", icon: Home },
    { href: "/calendar", label: "Lịch", icon: CalendarDays },
  ],
  ta: [
    { href: "/ta", label: "Trang chủ", icon: Home },
    { href: "/calendar", label: "Lịch", icon: CalendarDays },
  ],
  student: [
    { href: "/student", label: "Trang chủ", icon: Home },
    { href: "/student/join", label: "Vào lớp", icon: GraduationCap },
    { href: "/calendar", label: "Lịch", icon: CalendarDays },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  teacher: "Giáo viên",
  ta: "Trợ giảng",
  student: "Học sinh",
};

export function AppShell({
  user,
  streak,
  children,
}: {
  user: SessionUser;
  streak?: number;
  children: React.ReactNode;
}) {
  const nav = NAV[user.role] ?? NAV.student;

  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar — desktop */}
      <aside className="hidden w-[248px] shrink-0 flex-col gap-6 border-r border-line bg-surface px-5 py-6 md:flex">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-full bg-primary text-white">
            <GraduationCap size={18} />
          </span>
          <span className="font-display text-lg font-extrabold text-ink">HocSAT</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-semibold text-body transition-colors hover:bg-primary-soft hover:text-primary"
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          {user.role === "student" && streak !== undefined && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-accent-soft px-3 py-2">
              <Flame size={18} className="text-accent-warm" />
              <span className="tnum text-sm font-bold text-ink">{streak} ngày</span>
              <span className="text-[13px] text-muted">giữ lửa</span>
            </div>
          )}

          <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-sunken px-3 py-2.5">
            <Avatar name={user.name} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink">{user.name}</p>
              <Badge tone="brand">{ROLE_LABEL[user.role]}</Badge>
            </div>
          </div>

          <SignOutButton />
        </div>
      </aside>

      {/* Thanh trên — mobile.
          Đăng xuất phải nằm ở đây: sidebar (chỗ duy nhất còn lại có nút này)
          bị ẩn dưới md, nên trên điện thoại không có đường nào thoát ra. */}
      <header className="flex items-center justify-between border-b border-line bg-surface px-5 py-3 md:hidden">
        <Link href="/dashboard" className="font-display text-lg font-extrabold text-ink">
          HocSAT
        </Link>
        <div className="flex items-center gap-2">
          <Avatar name={user.name} size={32} />
          <SignOutButton variant="icon" />
        </div>
      </header>

      {/* pb-24 chừa chỗ cho tab bar fixed — nếu không, thẻ cuối trang bị che. */}
      <main className="min-w-0 flex-1 px-5 pb-24 pt-6 md:px-8 md:py-8 md:pb-8">
        <div className="fade-up mx-auto max-w-[1180px]">{children}</div>
      </main>

      {/* Tab bar — mobile */}
      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-line bg-surface py-2 md:hidden">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-0.5 px-4 py-1 text-muted">
            <Icon size={20} />
            <span className="text-[11px] font-semibold">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
