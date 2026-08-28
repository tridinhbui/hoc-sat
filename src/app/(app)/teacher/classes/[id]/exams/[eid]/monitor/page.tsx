import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireClassRole } from "@/lib/auth/guard";
import { STAFF } from "@/lib/auth/policy";
import { examMonitor, getExam } from "@/lib/repo/exams";
import { ExamMonitor } from "@/components/exam/monitor";

export default async function Monitor({
  params,
}: PageProps<"/teacher/classes/[id]/exams/[eid]/monitor">) {
  const { id, eid } = await params;
  const ctx = await requireClassRole(id, STAFF);
  const [exam, rows] = await Promise.all([getExam(ctx, eid), examMonitor(ctx, eid)]);

  return (
    <div className="space-y-4">
      <Link
        href={`/teacher/classes/${id}/exams/${eid}`}
        className="flex w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"
      >
        <ArrowLeft size={16} /> {exam.title}
      </Link>

      <ExamMonitor
        classId={id}
        examId={eid}
        rows={rows}
        canVoid={ctx.classRole === "teacher"}
      />
    </div>
  );
}
