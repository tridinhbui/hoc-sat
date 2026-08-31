import "server-only";
import { and, asc, eq, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { answers, assignments, classMembers, questions, submissions } from "@/db/schema";
import type { AuthContext } from "@/lib/auth/guard";
import { ForbiddenError } from "@/lib/auth/policy";
import { gradeAnswer } from "@/lib/grading/normalize";
import type { PracticeQuestion, WeakDomain } from "@/lib/practice/types";

export type { PracticeQuestion, WeakDomain };

/* ------------------------------------------------------------------ *
 * Luyện tập cá nhân hoá.
 *
 * Bộ ôn dựng từ chính những câu học sinh đã làm sai, nên không có nguồn
 * đề nào phải nhập thêm. Thứ tự ưu tiên: câu từng sai trước, rồi tới câu
 * cùng mảng kiến thức mà em chưa gặp.
 *
 * Hai ranh giới bảo mật, cả hai đều nằm trong file này:
 *  - Chỉ lấy câu thuộc bài ĐÃ PUBLISH của lớp mà em đang là học sinh.
 *  - `correct_answer` và `explanation` không rời server trước khi em trả
 *    lời. Chấm xảy ra ở server, client chỉ nhận đúng/sai.
 *
 * Luyện tập KHÔNG ghi vào `answers`: bảng đó là bài nộp có điểm, còn đây
 * là chỗ tập nháp. Trộn hai thứ vào nhau thì điểm số của em sẽ đổi mỗi
 * lần em ôn lại, và báo cáo gửi phụ huynh sẽ không giải thích được.
 * ------------------------------------------------------------------ */

const UNTAGGED = "Chưa gắn nhãn";

/** Bài tập đã publish của mọi lớp mà user đang là HỌC SINH. */
async function myAssignmentIds(ctx: AuthContext): Promise<string[]> {
  const rows = await ctx.db
    .select({ id: assignments.id })
    .from(assignments)
    .innerJoin(classMembers, eq(classMembers.classId, assignments.classId))
    .where(
      and(
        eq(classMembers.userId, ctx.user.id),
        eq(classMembers.role, "student"),
        isNotNull(assignments.publishedAt),
      ),
    );
  return rows.map((r) => r.id);
}

/**
 * Mảng kiến thức học sinh đang yếu, xếp yếu nhất lên đầu.
 *
 * Chỉ tính câu đã chấm (`is_correct` khác NULL) — câu tự luận giáo viên
 * chưa chấm không nói lên điều gì về năng lực.
 */
export async function weakDomains(ctx: AuthContext): Promise<WeakDomain[]> {
  const ids = await myAssignmentIds(ctx);
  if (ids.length === 0) return [];

  const rows = await ctx.db
    .select({
      domain: questions.domain,
      answered: sql<number>`count(*)`,
      correct: sql<number>`sum(case when ${answers.isCorrect} then 1 else 0 end)`,
    })
    .from(answers)
    .innerJoin(questions, eq(questions.id, answers.questionId))
    .innerJoin(submissions, eq(submissions.id, answers.submissionId))
    .where(
      and(
        eq(submissions.studentId, ctx.user.id),
        inArray(submissions.assignmentId, ids),
        isNotNull(answers.isCorrect),
      ),
    )
    .groupBy(questions.domain);

  return rows
    .map((r) => {
      const answered = Number(r.answered);
      const correct = Number(r.correct);
      return {
        domain: r.domain?.trim() || UNTAGGED,
        answered,
        correct,
        wrong: answered - correct,
        rate: answered > 0 ? Math.round((correct / answered) * 100) : null,
      };
    })
    .filter((d) => d.wrong > 0)
    .sort((a, b) => (a.rate ?? 100) - (b.rate ?? 100));
}

/**
 * Bộ câu ôn cho một mảng kiến thức.
 *
 * Câu từng sai đứng trước vì đó là chỗ đang hổng thật; hết câu sai mới
 * lấy tới câu chưa làm bao giờ. Đáp án không nằm trong kết quả trả về.
 */
export async function buildPracticeSet(
  ctx: AuthContext,
  domain: string,
  limit = 10,
): Promise<PracticeQuestion[]> {
  const ids = await myAssignmentIds(ctx);
  if (ids.length === 0) return [];

  // Câu tự luận cần giáo viên chấm tay, không tự luyện được.
  const domainMatches =
    domain === UNTAGGED
      ? sql`(${questions.domain} IS NULL OR trim(${questions.domain}) = '')`
      : eq(questions.domain, domain);

  const rows = await ctx.db
    .select({
      id: questions.id,
      prompt: questions.prompt,
      imageR2Key: questions.imageR2Key,
      type: questions.type,
      choices: questions.choices,
      domain: questions.domain,
      skillTag: questions.skillTag,
    })
    .from(questions)
    .where(
      and(
        inArray(questions.assignmentId, ids),
        ne(questions.type, "free_text"),
        domainMatches,
      ),
    )
    .orderBy(asc(questions.orderIndex));
  if (rows.length === 0) return [];

  // Lịch sử của chính học sinh với các câu đó. Truy vấn riêng thay vì
  // subquery tương quan: gộp vào một câu thì `answers` và `submissions`
  // xuất hiện hai lần và SQLite báo ambiguous column.
  const history = await ctx.db
    .select({ questionId: answers.questionId, isCorrect: answers.isCorrect })
    .from(answers)
    .innerJoin(submissions, eq(submissions.id, answers.submissionId))
    .where(
      and(
        eq(submissions.studentId, ctx.user.id),
        inArray(answers.questionId, rows.map((r) => r.id)),
      ),
    );

  const wrong = new Set<string>();
  const seen = new Set<string>();
  for (const h of history) {
    seen.add(h.questionId);
    if (h.isCorrect === false) wrong.add(h.questionId);
  }

  return rows
    .map((r) => ({
      id: r.id,
      prompt: r.prompt,
      imageR2Key: r.imageR2Key,
      type: r.type as "mcq" | "grid_in",
      choices: r.choices,
      domain: r.domain,
      skillTag: r.skillTag,
      seenBefore: seen.has(r.id),
      wrongBefore: wrong.has(r.id),
    }))
    .sort((a, b) => {
      // Từng sai lên đầu, rồi tới câu chưa gặp, cuối cùng là câu đã làm đúng.
      const rank = (q: PracticeQuestion) => (q.wrongBefore ? 0 : q.seenBefore ? 2 : 1);
      return rank(a) - rank(b);
    })
    .slice(0, limit);
}

export type PracticeResult = {
  correct: boolean;
  correctAnswer: string | null;
  explanation: string | null;
};

/**
 * Chấm một câu luyện tập.
 *
 * Kiểm tra câu có thuộc lớp của em không TRƯỚC khi đọc đáp án: nếu không,
 * chỉ cần biết id là lấy được đáp án của mọi câu trong hệ thống.
 */
export async function gradePractice(
  ctx: AuthContext,
  questionId: string,
  response: string,
): Promise<PracticeResult> {
  const ids = await myAssignmentIds(ctx);
  if (ids.length === 0) throw new ForbiddenError("Câu hỏi không thuộc lớp của bạn.");

  const q = await ctx.db.query.questions.findFirst({
    where: and(eq(questions.id, questionId), inArray(questions.assignmentId, ids)),
  });
  if (!q) throw new ForbiddenError("Câu hỏi không thuộc lớp của bạn.");

  const graded = gradeAnswer(
    {
      type: q.type,
      correctAnswer: q.correctAnswer,
      acceptedAnswers: q.acceptedAnswers,
      points: q.points,
    },
    response,
  );

  return {
    correct: graded.isCorrect === true,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
  };
}
