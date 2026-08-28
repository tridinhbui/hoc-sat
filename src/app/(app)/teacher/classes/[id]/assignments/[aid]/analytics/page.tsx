import { requireClassRole } from "@/lib/auth/guard";
import { TEACHER_ONLY } from "@/lib/auth/policy";
import { getAssignment } from "@/lib/repo/assignments";
import { answerHeatmap, questionStats } from "@/lib/repo/questions";
import { AssignmentDetailHeader } from "@/components/class/assignment-detail-header";
import { AssignmentSubnav } from "@/components/quiz/assignment-subnav";
import { QuizAnalytics } from "@/components/quiz/analytics";

export default async function Analytics({
  params,
}: PageProps<"/teacher/classes/[id]/assignments/[aid]/analytics">) {
  const { id, aid } = await params;
  const ctx = await requireClassRole(id, TEACHER_ONLY);
  const [assignment, stats, heatmap] = await Promise.all([
    getAssignment(ctx, aid),
    questionStats(ctx, aid),
    answerHeatmap(ctx, aid),
  ]);

  return (
    <div className="space-y-4">
      <AssignmentDetailHeader {...assignment} />
      <AssignmentSubnav base={`/teacher/classes/${id}/assignments/${aid}`} />
      <QuizAnalytics stats={stats} heatmap={heatmap} />
    </div>
  );
}
