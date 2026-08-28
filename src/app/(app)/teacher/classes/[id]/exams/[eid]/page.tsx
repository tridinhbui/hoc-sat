import Link from "next/link";
import { Activity, ShieldCheck } from "lucide-react";
import { requireClassRole } from "@/lib/auth/guard";
import { TEACHER_ONLY } from "@/lib/auth/policy";
import { getExam } from "@/lib/repo/exams";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/utils/date";
import { EXAM_KIND_LABEL, type ExamKind } from "@/lib/exam/types";
import { ExamActions } from "@/components/exam/exam-actions";

export default async function ExamDetail({
  params,
}: PageProps<"/teacher/classes/[id]/exams/[eid]">) {
  const { id, eid } = await params;
  const ctx = await requireClassRole(id, TEACHER_ONLY);
  const exam = await getExam(ctx, eid);

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone="brand">{EXAM_KIND_LABEL[exam.kind as ExamKind]}</Badge>
          {exam.lockdown && (
            <Badge tone="danger">
              <ShieldCheck /> Khoá màn hình · ngưỡng {exam.violationLimit}
            </Badge>
          )}
        </div>
        <h2>{exam.title}</h2>
        <p className="text-[13px] text-muted">
          {fmtDateTime(exam.openAt)} → {fmtDateTime(exam.closeAt)}
        </p>

        <div className="mt-4">
          <Link href={`/teacher/classes/${id}/exams/${eid}/monitor`}>
            <Button size="sm">
              <Activity /> Màn giám sát
            </Button>
          </Link>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Module</CardTitle>
            <CardDescription>Bấm vào để soạn câu hỏi cho từng module.</CardDescription>
          </div>
        </CardHeader>

        <ul className="space-y-2">
          {exam.modules.map((m, i) => (
            <li key={m.id}>
              <Link
                href={`/teacher/classes/${id}/exams/${eid}/modules/${m.id}`}
                className="rise flex items-center gap-3 rounded-[var(--radius-md)] border border-line px-4 py-3"
              >
                <Badge tone="brand">Module {i + 1}</Badge>
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{m.name}</span>
                <span className="tnum text-[13px] text-muted">
                  {m.durationMinutes} phút · {m.questionCount} câu
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <ExamActions classId={id} examId={eid} released={exam.released} />
    </div>
  );
}
