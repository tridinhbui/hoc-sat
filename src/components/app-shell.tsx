import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/sign-out-button";
import type { SessionUser } from "@/lib/auth/guard";

interface NavItem {
  href: string;
  label: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const STUDENT_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/student", label: "Trang chủ" },
      { href: "/calendar", label: "Lịch học và thi" },
    ],
  },
  {
    title: "HỌC TẬP",
    items: [
      { href: "/student/classes", label: "Khóa học của tôi" },
      { href: "/student/join", label: "Vào lớp mới" },
    ],
  },
];

const TEACHER_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/teacher", label: "Tổng quan" },
      { href: "/calendar", label: "Lịch giảng dạy" },
    ],
  },
  {
    title: "QUẢN LÝ",
    items: [
      { href: "/teacher", label: "Lớp học phụ trách" },
      { href: "/teacher/classes/new", label: "Tạo lớp mới" },
    ],
  },
];

const TA_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/ta", label: "Tổng quan" },
      { href: "/calendar", label: "Lịch trợ giảng" },
    ],
  },
  {
    title: "LỚP HỌC",
    items: [{ href: "/ta", label: "Danh sách lớp" }],
  },
];

const ADMIN_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/admin/users", label: "Tài khoản người dùng" },
      { href: "/calendar", label: "Lịch toàn trung tâm" },
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
  children,
}: {
  user: SessionUser;
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
          SIDEBAR (Desktop), Phong cách Lumist.ai
          ------------------------------------------------------------- */}
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-line bg-surface px-4 py-5 md:flex">
        {/* Logo brand */}
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="font-display text-lg font-black tracking-tight text-primary">
              AtlasSAT
            </span>
          </Link>
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
              {section.items.map((item) => (
                <Link
                  key={item.label + item.href}
                  href={item.href}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-body transition-colors hover:bg-primary-soft hover:text-primary"
                >
                  {item.label}
                </Link>
              ))}
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
        {/* Header Mobile */}
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
          <Link href="/dashboard">
            <span className="font-display text-base font-extrabold text-primary">AtlasSAT</span>
          </Link>

          <div className="flex items-center gap-3">
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
            className="px-3 py-1 text-primary"
          >
            <span className="text-xs font-bold">Trang chủ</span>
          </Link>
          <Link
            href={user.role === "student" ? "/student/classes" : "/teacher"}
            className="px-3 py-1 text-muted"
          >
            <span className="text-xs font-semibold">Khóa học</span>
          </Link>
          <Link href="/calendar" className="px-3 py-1 text-muted">
            <span className="text-xs font-semibold">Lịch thi</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
