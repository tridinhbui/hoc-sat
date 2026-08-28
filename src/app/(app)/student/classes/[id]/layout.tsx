import { requireClassRole } from "@/lib/auth/guard";
import { ANY_MEMBER } from "@/lib/auth/policy";
import { ClassHeader } from "@/components/class/class-header";

export default async function StudentClassLayout({
  params,
  children,
}: LayoutProps<"/student/classes/[id]">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, ANY_MEMBER);
  const base = `/student/classes/${id}`;

  return (
    <div className="space-y-5">
      <ClassHeader
        name={ctx.klass.name}
        code={ctx.klass.code}
        subject={ctx.klass.subject}
        scheduleNote={ctx.klass.scheduleNote}
        // Học sinh không cần mã lớp — và không nên phát tán nó ra ngoài.
        showCode={false}
        tabs={[
          { href: `${base}/stream`, label: "Thông báo" },
          { href: `${base}/assignments`, label: "Bài tập" },
          { href: `${base}/materials`, label: "Tài liệu" },
          { href: `${base}/grades`, label: "Điểm" },
          { href: `${base}/attendance`, label: "Chuyên cần" },
        ]}
      />
      {children}
    </div>
  );
}
