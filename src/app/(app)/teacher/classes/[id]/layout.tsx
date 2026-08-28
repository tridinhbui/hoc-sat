import { requireClassRole } from "@/lib/auth/guard";
import { TEACHER_ONLY } from "@/lib/auth/policy";
import { ClassHeader } from "@/components/class/class-header";

export default async function TeacherClassLayout({
  params,
  children,
}: LayoutProps<"/teacher/classes/[id]">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, TEACHER_ONLY);
  const base = `/teacher/classes/${id}`;

  return (
    <div className="space-y-5">
      <ClassHeader
        name={ctx.klass.name}
        code={ctx.klass.code}
        subject={ctx.klass.subject}
        scheduleNote={ctx.klass.scheduleNote}
        showCode
        tabs={[
          { href: `${base}/stream`, label: "Thông báo" },
          { href: `${base}/assignments`, label: "Bài tập" },
          { href: `${base}/materials`, label: "Tài liệu" },
          { href: `${base}/attendance`, label: "Điểm danh" },
          { href: `${base}/people`, label: "Học sinh" },
          { href: `${base}/settings`, label: "Cài đặt" },
        ]}
      />
      {children}
    </div>
  );
}
