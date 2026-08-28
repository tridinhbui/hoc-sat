import { requireClassRole } from "@/lib/auth/guard";
import { getAssignment, listSubmissions } from "@/lib/repo/assignments";
import { AssignmentDetailHeader } from "@/components/class/assignment-detail-header";
import { AssignmentPublishBar } from "@/components/class/assignment-publish-bar";
import { SubmissionTable } from "@/components/class/submission-table";

export default async function AssignmentDetail({
  params,
}: PageProps<"/ta/classes/[id]/assignments/[aid]">) {
  const { id, aid } = await params;
  const ctx = await requireClassRole(id, ["ta"]);
  const [assignment, rows] = await Promise.all([
    getAssignment(ctx, aid),
    listSubmissions(ctx, aid),
  ]);

  return (
    <div className="space-y-4">
      <AssignmentDetailHeader {...assignment} />
      <AssignmentPublishBar
        classId={id}
        assignmentId={aid}
        published={!!assignment.publishedAt}
        canDelete={ctx.classRole === "teacher"}
      />
      <SubmissionTable classId={id} assignmentId={aid} maxPoints={assignment.points} rows={rows} />
    </div>
  );
}
