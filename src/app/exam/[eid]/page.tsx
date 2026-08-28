import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { ANY_MEMBER, ForbiddenError, assertClassAccess } from "@/lib/auth/policy";
import {
  enterExam,
  listExamQuestionsForStudent,
  listMyExamAnswers,
  countdownFor,
} from "@/lib/repo/exams";
import { ExamRoom } from "@/components/exam/exam-room";
import { ExamClosed } from "@/components/exam/exam-closed";
import { examClassOf } from "@/lib/repo/exams";

export const metadata: Metadata = { title: "Phòng thi" };

/**
 * Phòng thi đặt ngoài layout app: không sidebar, không thanh điều hướng.
 * Trong lúc thi, mọi đường thoát khỏi đề đều là một chỗ để phân tâm.
 */
export default async function ExamRoomPage({ params }: PageProps<"/exam/[eid]">) {
  const { eid } = await params;
  const auth = await requireUser();

  const classId = await examClassOf(auth, eid);
  if (!classId) return <ExamClosed message="Đề thi không tồn tại." />;

  let ctx;
  try {
    const access = await assertClassAccess(
      auth.db,
      { id: auth.user.id, role: auth.user.role },
      classId,
      ANY_MEMBER,
    );
    ctx = { ...auth, classId, classRole: access.classRole, klass: access.klass } as never;
  } catch (e) {
    return <ExamClosed message={e instanceof ForbiddenError ? e.message : "Không vào được."} />;
  }

  let entered;
  try {
    entered = await enterExam(ctx, eid);
  } catch (e) {
    return <ExamClosed message={e instanceof ForbiddenError ? e.message : "Không vào được."} />;
  }

  const { exam, attempt } = entered;

  if (attempt.status !== "in_progress") {
    return (
      <ExamClosed
        message="Bạn đã hoàn thành bài thi này."
        detail={
          exam.released && attempt.totalScore !== null
            ? `Điểm của bạn: ${attempt.totalScore}`
            : "Kết quả sẽ hiện khi giáo viên trả bài."
        }
      />
    );
  }

  const moduleId = attempt.currentModuleId ?? exam.modules[0].id;
  const idx = exam.modules.findIndex((m) => m.id === moduleId);
  const mod = exam.modules[idx];

  const [questions, myAnswers, expiresAt] = await Promise.all([
    listExamQuestionsForStudent(ctx, moduleId),
    listMyExamAnswers(ctx, attempt.id),
    countdownFor(ctx, attempt.id, moduleId),
  ]);

  const answerMap = Object.fromEntries(
    myAnswers
      .filter((a) => questions.some((q) => q.id === a.questionId))
      .map((a) => [a.questionId, { response: a.response, flagged: a.flagged }]),
  );

  return (
    <ExamRoom
      classId={classId}
      attemptId={attempt.id}
      module={{
        id: mod.id,
        name: mod.name,
        durationMinutes: mod.durationMinutes,
        orderIndex: mod.orderIndex,
      }}
      questions={questions}
      initialAnswers={answerMap}
      initialExpiresAt={expiresAt?.getTime() ?? null}
      lockdown={exam.lockdown}
      violationLimit={exam.violationLimit}
      violationCount={attempt.violationCount}
      moduleIndex={idx}
      moduleTotal={exam.modules.length}
    />
  );
}
