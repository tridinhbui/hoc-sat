"use client";

import { useActionState } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { fmtDateTime } from "@/lib/utils/date";
import { EXAM_KIND_LABEL, type ExamKind } from "@/lib/exam/types";
import { enterExamAction } from "@/lib/actions/exams";

export function StudentExamCard({
  classId,
  exam,
  attemptStatus,
  totalScore,
  maxScore,
}: {
  classId: string;
  exam: {
    id: string;
    title: string;
    kind: string;
    openAt: number;
    closeAt: number;
    lockdown: boolean;
    released: boolean;
    moduleCount: number;
  };
  attemptStatus: string | null;
  totalScore: number | null;
  maxScore: number;
}) {
  const [state, action] = useActionState(enterExamAction, null);

  const done =
    attemptStatus === "submitted" ||
    attemptStatus === "auto_submitted" ||
    attemptStatus === "voided";

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge tone="brand">{EXAM_KIND_LABEL[exam.kind as ExamKind]}</Badge>
            {exam.lockdown && (
              <Badge tone="danger">
                <ShieldCheck /> Khoá màn hình
              </Badge>
            )}
            {attemptStatus === "voided" && <Badge tone="danger">Lượt thi đã bị huỷ</Badge>}
            {done && attemptStatus !== "voided" && <Badge tone="success">Đã làm xong</Badge>}
          </div>
          <h3 className="truncate">{exam.title}</h3>
          <p className="text-[13px] text-muted">
            {fmtDateTime(exam.openAt)} → {fmtDateTime(exam.closeAt)} · {exam.moduleCount} module
          </p>
        </div>

        {/* Điểm chỉ hiện khi giáo viên đã trả kết quả. */}
        {done && exam.released && totalScore !== null && (
          <span className="tnum font-display shrink-0 text-2xl font-extrabold text-ink">
            {totalScore}
            <span className="text-base font-semibold text-muted">/{maxScore}</span>
          </span>
        )}
      </div>

      {!done && (
        <form action={action} className="mt-4 space-y-2">
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="examId" value={exam.id} />
          {state?.error && <Alert>{state.error}</Alert>}
          <SubmitButton size="sm" pendingText="Đang vào...">
            <LogIn /> {attemptStatus === "in_progress" ? "Quay lại phòng thi" : "Vào phòng thi"}
          </SubmitButton>
        </form>
      )}

      {done && !exam.released && attemptStatus !== "voided" && (
        <p className="mt-3 text-sm text-muted">
          Bài đã nộp. Kết quả hiện khi giáo viên trả bài.
        </p>
      )}
    </Card>
  );
}
