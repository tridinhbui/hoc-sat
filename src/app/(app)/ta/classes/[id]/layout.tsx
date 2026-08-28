import { requireClassRole } from "@/lib/auth/guard";
import { ClassHeader } from "@/components/class/class-header";

export default async function TaClassLayout({
  params,
  children,
}: LayoutProps<"/ta/classes/[id]">) {
  const { id } = await params;
  // Chỉ TA — giáo viên đi đường /teacher. Chặn ở đây để TA không lạc sang
  // nhánh có tab Cài đặt / Học sinh.
  const ctx = await requireClassRole(id, ["ta"]);
  const base = `/ta/classes/${id}`;

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
          { href: `${base}/attendance`, label: "Điểm danh" },
          { href: `${base}/reports`, label: "Báo cáo" },
        ]}
      />
      {children}
    </div>
  );
}
