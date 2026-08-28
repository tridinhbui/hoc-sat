import { requireClassRole } from "@/lib/auth/guard";
import { getAssignment } from "@/lib/repo/assignments";
import { listQuestionsForStaff } from "@/lib/repo/questions";
import { AssignmentDetailHeader } from "@/components/class/assignment-detail-header";
import { AssignmentSubnav } from "@/components/quiz/assignment-subnav";
import { QuestionEditor } from "@/components/quiz/question-editor";

export default async function Questions({
  params,
}: PageProps<"/ta/classes/[id]/assignments/[aid]/questions">) {
  const { id, aid } = await params;
  const ctx = await requireClassRole(id, ["ta"]);
  const [assignment, questions] = await Promise.all([
    getAssignment(ctx, aid),
    listQuestionsForStaff(ctx, aid),
  ]);

  return (
    <div className="space-y-4">
      <AssignmentDetailHeader {...assignment} />
      <AssignmentSubnav base={`/ta/classes/${id}/assignments/${aid}`} />
      <QuestionEditor classId={id} assignmentId={aid} questions={questions} />
    </div>
  );
}
