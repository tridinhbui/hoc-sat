"use client";

import { useActionState } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { deleteAssignmentAction, setPublishedAction } from "@/lib/actions/assignments";

export function AssignmentPublishBar({
  classId,
  assignmentId,
  published,
  canDelete,
}: {
  classId: string;
  assignmentId: string;
  published: boolean;
  canDelete: boolean;
}) {
  const [state, action] = useActionState(setPublishedAction, null);

  return (
    <div className="space-y-2">
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.ok}</Alert>}

      <div className="flex flex-wrap justify-end gap-2">
        <form action={action}>
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="assignmentId" value={assignmentId} />
          <input type="hidden" name="publish" value={String(!published)} />
          <SubmitButton variant="secondary" size="sm">
            {published ? (
              <>
                <EyeOff /> Rút về nháp
              </>
            ) : (
              <>
                <Eye /> Giao cho lớp
              </>
            )}
          </SubmitButton>
        </form>

        {canDelete && (
          <form
            action={deleteAssignmentAction}
            onSubmit={(e) => {
              if (!confirm("Xoá bài tập này? Toàn bộ bài nộp và điểm sẽ mất theo.")) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="classId" value={classId} />
            <input type="hidden" name="assignmentId" value={assignmentId} />
            <SubmitButton variant="ghost" size="sm">
              <Trash2 /> Xoá
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
