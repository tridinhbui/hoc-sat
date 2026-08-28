"use client";

import { useActionState } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { deleteExamAction, setReleasedAction } from "@/lib/actions/exams";

export function ExamActions({
  classId,
  examId,
  released,
}: {
  classId: string;
  examId: string;
  released: boolean;
}) {
  const [state, action] = useActionState(setReleasedAction, null);

  return (
    <div className="space-y-2">
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.ok}</Alert>}

      <div className="flex flex-wrap justify-end gap-2">
        <form action={action}>
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="examId" value={examId} />
          <input type="hidden" name="released" value={String(!released)} />
          <SubmitButton variant="secondary" size="sm">
            {released ? (
              <>
                <EyeOff /> Ẩn kết quả
              </>
            ) : (
              <>
                <Eye /> Cho xem kết quả
              </>
            )}
          </SubmitButton>
        </form>

        <form
          action={deleteExamAction}
          onSubmit={(e) => {
            if (!confirm("Xoá đề thi này? Chỉ xoá được khi chưa có ai vào thi.")) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="examId" value={examId} />
          <SubmitButton variant="ghost" size="sm">
            <Trash2 /> Xoá đề
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
