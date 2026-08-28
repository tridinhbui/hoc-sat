import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireClassRole } from "@/lib/auth/guard";
import { TEACHER_ONLY } from "@/lib/auth/policy";
import { getExam, listModuleQuestionsForStaff } from "@/lib/repo/exams";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuestionEditor } from "@/components/quiz/question-editor";

export default async function ModuleQuestions({
  params,
}: PageProps<"/teacher/classes/[id]/exams/[eid]/modules/[mid]">) {
  const { id, eid, mid } = await params;
  const ctx = await requireClassRole(id, TEACHER_ONLY);
  const [exam, questions] = await Promise.all([
    getExam(ctx, eid),
    listModuleQuestionsForStaff(ctx, mid),
  ]);

  const mod = exam.modules.find((m) => m.id === mid);
  if (!mod) throw new Error("Module không tồn tại.");

  return (
    <div className="space-y-4">
      <Link
        href={`/teacher/classes/${id}/exams/${eid}`}
        className="flex w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"
      >
        <ArrowLeft size={16} /> {exam.title}
      </Link>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">{mod.name}</Badge>
          <span className="tnum text-[13px] text-muted">
            {mod.durationMinutes} phút · dự kiến {mod.questionCount} câu
          </span>
          {questions.length !== mod.questionCount && (
            <Badge tone="accent">
              Đang có {questions.length}/{mod.questionCount} câu
            </Badge>
          )}
        </div>
      </Card>

      <QuestionEditor
        classId={id}
        moduleId={mid}
        questions={questions}
        hint="Máy chấm ngay khi học sinh nộp module."
      />
    </div>
  );
}
