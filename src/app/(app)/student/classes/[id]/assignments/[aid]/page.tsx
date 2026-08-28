import { requireClassRole } from "@/lib/auth/guard";
import { ANY_MEMBER } from "@/lib/auth/policy";
import { getAssignment, getMySubmission } from "@/lib/repo/assignments";
import { AssignmentDetailHeader } from "@/components/class/assignment-detail-header";
import { SubmitPanel } from "@/components/class/submit-panel";

export default async function StudentAssignmentDetail({
  params,
}: PageProps<"/student/classes/[id]/assignments/[aid]">) {
  const { id, aid } = await params;
  const ctx = await requireClassRole(id, ANY_MEMBER);
  const [assignment, submission] = await Promise.all([
    getAssignment(ctx, aid),
    getMySubmission(ctx, aid),
  ]);

  return (
    <div className="space-y-4">
      <AssignmentDetailHeader {...assignment} />
      <SubmitPanel
        classId={id}
        assignmentId={aid}
        maxPoints={assignment.points}
        overdue={assignment.overdue}
        allowLate={assignment.allowLate}
        submission={
          submission && {
            status: submission.status,
            turnedInAt: submission.turnedInAt,
            isLate: submission.isLate,
            finalGrade: submission.finalGrade,
            feedback: submission.feedback,
            files: submission.files,
          }
        }
      />
    </div>
  );
}
