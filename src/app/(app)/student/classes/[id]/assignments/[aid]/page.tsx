import { requireClassRole } from "@/lib/auth/guard";
import { ANY_MEMBER } from "@/lib/auth/policy";
import { getAssignment, getMySubmission, startQuiz } from "@/lib/repo/assignments";
import { listMyAnswers, listQuestionsForStudent } from "@/lib/repo/questions";
import { AssignmentDetailHeader } from "@/components/class/assignment-detail-header";
import { SubmitPanel } from "@/components/class/submit-panel";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { QuizReview } from "@/components/quiz/quiz-review";

export default async function StudentAssignmentDetail({
  params,
}: PageProps<"/student/classes/[id]/assignments/[aid]">) {
  const { id, aid } = await params;
  const ctx = await requireClassRole(id, ANY_MEMBER);
  const assignment = await getAssignment(ctx, aid);

  const isQuiz = assignment.kind === "quiz" || assignment.kind === "mixed";

  // Bài nộp file thuần: giữ nguyên luồng của P2.
  if (!isQuiz) {
    const submission = await getMySubmission(ctx, aid);
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

  // Bài trắc nghiệm: tạo sẵn chỗ lưu tạm đáp án.
  const submission = await startQuiz(ctx, aid);
  const returned = submission.status === "returned";

  const [questions, myAnswers] = await Promise.all([
    // Đáp án và lời giải CHỈ kèm theo khi bài đã trả.
    listQuestionsForStudent(ctx, aid, { revealAnswers: returned }),
    listMyAnswers(ctx, submission.id),
  ]);

  const answerMap = Object.fromEntries(
    myAnswers.map((a) => [
      a.questionId,
      { response: a.response, flagged: a.flagged, isCorrect: a.isCorrect },
    ]),
  );

  return (
    <div className="space-y-4">
      <AssignmentDetailHeader {...assignment} />

      {returned ? (
        <>
          <SubmitPanel
            classId={id}
            assignmentId={aid}
            maxPoints={assignment.points}
            overdue={assignment.overdue}
            allowLate={assignment.allowLate}
            submission={{
              status: submission.status,
              turnedInAt: submission.turnedInAt,
              isLate: submission.isLate,
              finalGrade: submission.finalGrade,
              feedback: submission.feedback,
              files: submission.files,
            }}
          />
          <QuizReview questions={questions} answers={answerMap} />
        </>
      ) : (
        <>
          <QuizRunner
            classId={id}
            assignmentId={aid}
            submissionId={submission.id}
            questions={questions}
            initialAnswers={answerMap}
            turnedIn={submission.status === "turned_in"}
          />
          {submission.status === "turned_in" && (
            <SubmitPanel
              classId={id}
              assignmentId={aid}
              maxPoints={assignment.points}
              overdue={assignment.overdue}
              allowLate={assignment.allowLate}
              submission={{
                status: submission.status,
                turnedInAt: submission.turnedInAt,
                isLate: submission.isLate,
                finalGrade: submission.finalGrade,
                feedback: submission.feedback,
                files: submission.files,
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
