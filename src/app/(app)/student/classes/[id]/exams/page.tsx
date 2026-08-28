import { requireClassRole } from "@/lib/auth/guard";
import { ANY_MEMBER } from "@/lib/auth/policy";
import { listExams, myExamResult } from "@/lib/repo/exams";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Cu } from "@/components/mascot/cu";
import { StudentExamCard } from "@/components/exam/student-exam-card";

export default async function StudentExams({
  params,
}: PageProps<"/student/classes/[id]/exams">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, ANY_MEMBER);
  const exams = await listExams(ctx);

  if (exams.length === 0) {
    return (
      <Card>
        <EmptyState
          mascot={<Cu pose="sleep" size={110} />}
          title="Chưa có kỳ thi nào"
          description="Lịch thi giữa kỳ và cuối kỳ sẽ xuất hiện ở đây."
        />
      </Card>
    );
  }

  const results = await Promise.all(exams.map((e) => myExamResult(ctx, e.id)));

  return (
    <div className="space-y-3">
      {exams.map((e, i) => (
        <StudentExamCard
          key={e.id}
          classId={id}
          exam={{
            id: e.id,
            title: e.title,
            kind: e.kind,
            openAt: e.openAt.getTime(),
            closeAt: e.closeAt.getTime(),
            lockdown: e.lockdown,
            released: e.released,
            moduleCount: e.modules.length,
          }}
          attemptStatus={results[i]?.attempt.status ?? null}
          totalScore={results[i]?.attempt.totalScore ?? null}
          maxScore={results[i]?.maxScore ?? 0}
        />
      ))}
    </div>
  );
}
