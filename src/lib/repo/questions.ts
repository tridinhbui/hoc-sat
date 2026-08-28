import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  answers,
  assignments,
  classMembers,
  examModules,
  exams,
  questions,
  submissions,
  user,
} from "@/db/schema";
import type { ClassContext } from "@/lib/auth/guard";
import { ForbiddenError, canGrade, canPost } from "@/lib/auth/policy";
import { gradeAnswer } from "@/lib/grading/normalize";

/* ------------------------------------------------------------------ *
 * Câu hỏi trắc nghiệm và auto-chấm.
 *
 * Luật số một: `correct_answer` và `explanation` KHÔNG BAO GIỜ được rời
 * server về phía học sinh khi bài chưa trả. Vì vậy mọi truy vấn cho học
 * sinh đều liệt kê cột tường minh — không dùng `select *`, không trả cả
 * hàng rồi mới lọc ở component.
 * ------------------------------------------------------------------ */

export type ChoiceOption = { key: string; text: string };

export type QuestionInput = {
  type: "mcq" | "grid_in" | "free_text";
  prompt: string;
  choices?: ChoiceOption[] | null;
  correctAnswer?: string | null;
  acceptedAnswers?: string[] | null;
  explanation?: string | null;
  points: number;
  domain?: string | null;
  skillTag?: string | null;
  imageR2Key?: string | null;
};

function assertStaff(ctx: ClassContext) {
  if (!canGrade(ctx.classRole)) {
    throw new ForbiddenError("Chức năng này dành cho giáo viên và trợ giảng.");
  }
}

async function assertAssignmentInClass(ctx: ClassContext, assignmentId: string) {
  const a = await ctx.db.query.assignments.findFirst({
    where: and(eq(assignments.id, assignmentId), eq(assignments.classId, ctx.classId)),
  });
  if (!a) throw new ForbiddenError("Bài tập không tồn tại.");
  return a;
}

function validate(input: QuestionInput) {
  if (!input.prompt.trim()) throw new Error("Câu hỏi cần có đề bài.");
  if (!Number.isFinite(input.points) || input.points <= 0) {
    throw new Error("Điểm mỗi câu phải là số dương.");
  }

  if (input.type === "mcq") {
    const choices = input.choices ?? [];
    if (choices.length < 2) throw new Error("Câu trắc nghiệm cần ít nhất 2 lựa chọn.");
    if (choices.some((c) => !c.text.trim())) throw new Error("Có lựa chọn đang để trống.");
    const keys = choices.map((c) => c.key);
    if (new Set(keys).size !== keys.length) throw new Error("Nhãn lựa chọn bị trùng.");
    if (!input.correctAnswer || !keys.includes(input.correctAnswer)) {
      throw new Error("Chọn đáp án đúng trước khi lưu.");
    }
  }

  if (input.type === "grid_in" && !input.correctAnswer?.trim()) {
    throw new Error("Câu điền đáp số cần có đáp án đúng.");
  }
}

/* ------------------------------ Soạn đề ------------------------------ */

/** Bản đầy đủ, có đáp án — CHỈ dành cho giáo viên và TA. */
export async function listQuestionsForStaff(ctx: ClassContext, assignmentId: string) {
  assertStaff(ctx);
  await assertAssignmentInClass(ctx, assignmentId);
  return ctx.db.query.questions.findMany({
    where: eq(questions.assignmentId, assignmentId),
    orderBy: [asc(questions.orderIndex)],
  });
}

export async function createQuestion(
  ctx: ClassContext,
  assignmentId: string,
  input: QuestionInput,
) {
  if (!canPost(ctx.classRole)) throw new ForbiddenError();
  await assertAssignmentInClass(ctx, assignmentId);
  validate(input);

  const [{ n } = { n: 0 }] = await ctx.db
    .select({ n: sql<number>`count(*)` })
    .from(questions)
    .where(eq(questions.assignmentId, assignmentId));

  const id = crypto.randomUUID();
  await ctx.db.insert(questions).values({
    id,
    assignmentId,
    orderIndex: n,
    prompt: input.prompt.trim(),
    type: input.type,
    choices: input.type === "mcq" ? (input.choices ?? []) : null,
    correctAnswer: input.correctAnswer?.trim() || null,
    acceptedAnswers: input.acceptedAnswers?.length ? input.acceptedAnswers : null,
    explanation: input.explanation?.trim() || null,
    points: input.points,
    domain: input.domain?.trim() || null,
    skillTag: input.skillTag?.trim() || null,
    imageR2Key: input.imageR2Key ?? null,
  });

  // Có câu hỏi thì bài chuyển thành dạng chấm máy được.
  await ctx.db
    .update(assignments)
    .set({ kind: "quiz" })
    .where(eq(assignments.id, assignmentId));

  return id;
}

export async function deleteQuestion(ctx: ClassContext, assignmentId: string, questionId: string) {
  if (!canPost(ctx.classRole)) throw new ForbiddenError();
  await assertAssignmentInClass(ctx, assignmentId);

  const q = await ctx.db.query.questions.findFirst({
    where: and(eq(questions.id, questionId), eq(questions.assignmentId, assignmentId)),
  });
  if (!q) throw new ForbiddenError("Câu hỏi không tồn tại.");

  await ctx.db.delete(questions).where(eq(questions.id, questionId));
}

/**
 * Nhập đề hàng loạt. Gõ tay 27 câu mỗi module quá tốn công nên đây là
 * đường chính để đưa đề vào, không phải tính năng phụ.
 *
 * Định dạng mỗi dòng CSV:
 *   type,prompt,A,B,C,D,correct,points,domain,skill,explanation
 */
export type ImportRow = {
  type: string;
  prompt: string;
  choices: string[];
  correct: string;
  points?: string;
  domain?: string;
  skill?: string;
  explanation?: string;
};

export type ImportResult = {
  created: number;
  errors: { line: number; message: string }[];
};

export async function importQuestions(
  ctx: ClassContext,
  assignmentId: string,
  rows: ImportRow[],
): Promise<ImportResult> {
  if (!canPost(ctx.classRole)) throw new ForbiddenError();
  await assertAssignmentInClass(ctx, assignmentId);

  const errors: ImportResult["errors"] = [];
  let created = 0;

  for (const [i, row] of rows.entries()) {
    const line = i + 1;
    try {
      const type = row.type.trim().toLowerCase();
      if (type !== "mcq" && type !== "grid_in" && type !== "free_text") {
        throw new Error(`Loại câu "${row.type}" không hợp lệ (mcq / grid_in / free_text).`);
      }

      const choices = row.choices
        .map((text, idx) => ({ key: String.fromCharCode(65 + idx), text: text.trim() }))
        .filter((c) => c.text !== "");

      await createQuestion(ctx, assignmentId, {
        type,
        prompt: row.prompt,
        choices: type === "mcq" ? choices : null,
        correctAnswer: row.correct,
        points: row.points ? Number(row.points) : 1,
        domain: row.domain,
        skillTag: row.skill,
        explanation: row.explanation,
      });
      created++;
    } catch (e) {
      errors.push({ line, message: e instanceof Error ? e.message : "Lỗi không rõ." });
    }
  }

  return { created, errors };
}

/* --------------------------- Học sinh làm bài --------------------------- */

export type QuestionForStudent = {
  id: string;
  orderIndex: number;
  prompt: string;
  imageR2Key: string | null;
  type: "mcq" | "grid_in" | "free_text";
  choices: ChoiceOption[] | null;
  points: number;
  /** Chỉ có sau khi bài được trả */
  correctAnswer?: string | null;
  explanation?: string | null;
};

/**
 * Đề dành cho học sinh. Cột `correct_answer` và `explanation` chỉ được
 * kèm theo khi bài đã trả — đây là ranh giới bảo mật, không phải chuyện
 * hiển thị.
 */
export async function listQuestionsForStudent(
  ctx: ClassContext,
  assignmentId: string,
  opts: { revealAnswers: boolean },
): Promise<QuestionForStudent[]> {
  const rows = await ctx.db
    .select({
      id: questions.id,
      orderIndex: questions.orderIndex,
      prompt: questions.prompt,
      imageR2Key: questions.imageR2Key,
      type: questions.type,
      choices: questions.choices,
      points: questions.points,
      correctAnswer: questions.correctAnswer,
      explanation: questions.explanation,
    })
    .from(questions)
    .where(eq(questions.assignmentId, assignmentId))
    .orderBy(asc(questions.orderIndex));

  if (opts.revealAnswers) return rows;

  // Bỏ hẳn khỏi payload chứ không để lại rồi ẩn ở UI.
  return rows.map((r) => ({
    id: r.id,
    orderIndex: r.orderIndex,
    prompt: r.prompt,
    imageR2Key: r.imageR2Key,
    type: r.type,
    choices: r.choices,
    points: r.points,
  }));
}

export async function listMyAnswers(ctx: ClassContext, submissionId: string) {
  return ctx.db.query.answers.findMany({
    where: eq(answers.submissionId, submissionId),
  });
}

/**
 * Lưu tạm một câu trả lời trong lúc học sinh đang làm.
 * KHÔNG chấm ở đây — chấm chỉ xảy ra lúc nộp, để không lộ đúng/sai sớm.
 */
export async function saveAnswer(
  ctx: ClassContext,
  submissionId: string,
  questionId: string,
  input: { response: string | null; flagged?: boolean },
) {
  const sub = await ctx.db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
  });
  if (!sub || sub.studentId !== ctx.user.id) {
    throw new ForbiddenError("Đây không phải bài làm của bạn.");
  }
  if (sub.status !== "assigned" && sub.status !== "turned_in") {
    throw new ForbiddenError("Bài đã được trả, không sửa được nữa.");
  }
  if (sub.status === "turned_in") {
    throw new ForbiddenError("Bạn đã nộp bài rồi. Huỷ nộp trước nếu muốn sửa.");
  }

  const q = await ctx.db.query.questions.findFirst({ where: eq(questions.id, questionId) });
  if (!q || q.assignmentId !== sub.assignmentId) {
    throw new ForbiddenError("Câu hỏi không thuộc bài này.");
  }

  const existing = await ctx.db.query.answers.findFirst({
    where: and(eq(answers.submissionId, submissionId), eq(answers.questionId, questionId)),
  });

  if (existing) {
    await ctx.db
      .update(answers)
      .set({
        response: input.response,
        flagged: input.flagged ?? existing.flagged,
        answeredAt: new Date(),
      })
      .where(eq(answers.id, existing.id));
    return;
  }

  await ctx.db.insert(answers).values({
    id: crypto.randomUUID(),
    submissionId,
    questionId,
    response: input.response,
    flagged: input.flagged ?? false,
    answeredAt: new Date(),
  });
}

/* ------------------------------ Auto-chấm ------------------------------ */

/**
 * Chấm toàn bộ phần trắc nghiệm của một bài nộp.
 * Gọi ngay khi học sinh bấm nộp — nhưng điểm vẫn kín cho tới lúc trả bài.
 */
export async function autoGradeSubmission(ctx: ClassContext, submissionId: string) {
  const sub = await ctx.db.query.submissions.findFirst({
    where: eq(submissions.id, submissionId),
  });
  if (!sub) throw new ForbiddenError("Bài nộp không tồn tại.");

  const qs = await ctx.db.query.questions.findMany({
    where: eq(questions.assignmentId, sub.assignmentId),
  });
  if (qs.length === 0) return { autoScore: null, graded: 0 };

  const given = await ctx.db.query.answers.findMany({
    where: eq(answers.submissionId, submissionId),
  });
  const byQuestion = new Map(given.map((a) => [a.questionId, a]));

  let autoScore = 0;
  let graded = 0;
  const updates = [];

  for (const q of qs) {
    const a = byQuestion.get(q.id);
    const { isCorrect, pointsAwarded } = gradeAnswer(
      {
        type: q.type,
        correctAnswer: q.correctAnswer,
        acceptedAnswers: q.acceptedAnswers,
        points: q.points,
      },
      a?.response ?? null,
    );
    if (isCorrect === null) continue; // tự luận: để giáo viên chấm

    autoScore += pointsAwarded ?? 0;
    graded++;

    if (a) {
      updates.push(
        ctx.db
          .update(answers)
          .set({ isCorrect, pointsAwarded })
          .where(eq(answers.id, a.id)),
      );
    } else {
      // Bỏ trống vẫn phải ghi lại là sai, nếu không dashboard câu sai sẽ
      // đếm thiếu và tưởng cả lớp đều làm câu đó.
      updates.push(
        ctx.db.insert(answers).values({
          id: crypto.randomUUID(),
          submissionId,
          questionId: q.id,
          response: null,
          isCorrect: false,
          pointsAwarded: 0,
        }),
      );
    }
  }

  if (updates.length > 0) {
    await ctx.db.batch(updates as [(typeof updates)[number], ...typeof updates]);
  }

  await ctx.db
    .update(submissions)
    .set({ autoScore, finalGrade: autoScore + (sub.manualScore ?? 0) })
    .where(eq(submissions.id, submissionId));

  return { autoScore, graded };
}

/* ------------------------- Dashboard câu sai ------------------------- */

export type QuestionStat = {
  questionId: string;
  orderIndex: number;
  prompt: string;
  type: "mcq" | "grid_in" | "free_text";
  domain: string | null;
  skillTag: string | null;
  correctAnswer: string | null;
  correct: number;
  answered: number;
};

/** Tỉ lệ đúng từng câu — nhìn phát biết cả lớp vướng ở đâu. */
export async function questionStats(
  ctx: ClassContext,
  assignmentId: string,
): Promise<QuestionStat[]> {
  assertStaff(ctx);
  await assertAssignmentInClass(ctx, assignmentId);

  const qs = await ctx.db.query.questions.findMany({
    where: eq(questions.assignmentId, assignmentId),
    orderBy: [asc(questions.orderIndex)],
  });
  if (qs.length === 0) return [];

  const rows = await ctx.db
    .select({
      questionId: answers.questionId,
      answered: sql<number>`count(*)`,
      correct: sql<number>`sum(case when ${answers.isCorrect} then 1 else 0 end)`,
    })
    .from(answers)
    .innerJoin(submissions, eq(submissions.id, answers.submissionId))
    .where(
      and(
        eq(submissions.assignmentId, assignmentId),
        inArray(submissions.status, ["turned_in", "returned"]),
      ),
    )
    .groupBy(answers.questionId);

  const by = new Map(rows.map((r) => [r.questionId, r]));

  return qs.map((q) => ({
    questionId: q.id,
    orderIndex: q.orderIndex,
    prompt: q.prompt,
    type: q.type,
    domain: q.domain,
    skillTag: q.skillTag,
    correctAnswer: q.correctAnswer,
    correct: Number(by.get(q.id)?.correct ?? 0),
    answered: Number(by.get(q.id)?.answered ?? 0),
  }));
}

export type HeatmapRow = {
  studentId: string;
  name: string;
  status: "assigned" | "turned_in" | "returned";
  /** questionId → đúng/sai/chưa chấm */
  cells: Record<string, boolean | null>;
  correct: number;
};

/** Ma trận câu × học sinh. */
export async function answerHeatmap(
  ctx: ClassContext,
  assignmentId: string,
): Promise<HeatmapRow[]> {
  assertStaff(ctx);
  await assertAssignmentInClass(ctx, assignmentId);

  const students = await ctx.db
    .select({
      studentId: user.id,
      name: user.name,
      submissionId: submissions.id,
      status: submissions.status,
    })
    .from(classMembers)
    .innerJoin(user, eq(user.id, classMembers.userId))
    .leftJoin(
      submissions,
      and(eq(submissions.studentId, user.id), eq(submissions.assignmentId, assignmentId)),
    )
    .where(and(eq(classMembers.classId, ctx.classId), eq(classMembers.role, "student")))
    .orderBy(asc(user.name));

  const subIds = students.map((s) => s.submissionId).filter((x): x is string => !!x);
  const all = subIds.length
    ? await ctx.db.query.answers.findMany({ where: inArray(answers.submissionId, subIds) })
    : [];

  return students.map((s) => {
    const mine = all.filter((a) => a.submissionId === s.submissionId);
    const cells: Record<string, boolean | null> = {};
    for (const a of mine) cells[a.questionId] = a.isCorrect;
    return {
      studentId: s.studentId,
      name: s.name,
      status: s.status ?? "assigned",
      cells,
      correct: mine.filter((a) => a.isCorrect === true).length,
    };
  });
}

/** Gộp theo mảng kiến thức — biết lớp yếu Algebra hay Words in Context. */
export function summarizeByDomain(stats: QuestionStat[]) {
  const by = new Map<string, { correct: number; answered: number; questions: number }>();
  for (const s of stats) {
    const key = s.domain?.trim() || "Chưa gắn nhãn";
    const cur = by.get(key) ?? { correct: 0, answered: 0, questions: 0 };
    cur.correct += s.correct;
    cur.answered += s.answered;
    cur.questions += 1;
    by.set(key, cur);
  }
  return [...by.entries()]
    .map(([domain, v]) => ({ domain, ...v }))
    .sort((a, b) => {
      const ra = a.answered ? a.correct / a.answered : 1;
      const rb = b.answered ? b.correct / b.answered : 1;
      return ra - rb; // yếu nhất lên đầu
    });
}


/* --------------------- Câu hỏi thuộc module đề thi --------------------- */

async function assertModuleInClass(ctx: ClassContext, moduleId: string) {
  const [row] = await ctx.db
    .select({ moduleId: examModules.id })
    .from(examModules)
    .innerJoin(exams, eq(exams.id, examModules.examId))
    .where(and(eq(examModules.id, moduleId), eq(exams.classId, ctx.classId)));
  if (!row) throw new ForbiddenError("Module không tồn tại trong lớp này.");
}

/** Giống createQuestion nhưng gắn vào module đề thi thay vì bài tập. */
export async function createExamQuestion(
  ctx: ClassContext,
  moduleId: string,
  input: QuestionInput,
) {
  if (!canPost(ctx.classRole)) throw new ForbiddenError();
  await assertModuleInClass(ctx, moduleId);
  validate(input);

  const [{ n } = { n: 0 }] = await ctx.db
    .select({ n: sql<number>`count(*)` })
    .from(questions)
    .where(eq(questions.examModuleId, moduleId));

  const id = crypto.randomUUID();
  await ctx.db.insert(questions).values({
    id,
    examModuleId: moduleId,
    orderIndex: n,
    prompt: input.prompt.trim(),
    type: input.type,
    choices: input.type === "mcq" ? (input.choices ?? []) : null,
    correctAnswer: input.correctAnswer?.trim() || null,
    acceptedAnswers: input.acceptedAnswers?.length ? input.acceptedAnswers : null,
    explanation: input.explanation?.trim() || null,
    points: input.points,
    domain: input.domain?.trim() || null,
    skillTag: input.skillTag?.trim() || null,
    imageR2Key: input.imageR2Key ?? null,
  });
  return id;
}

export async function deleteExamQuestion(ctx: ClassContext, moduleId: string, questionId: string) {
  if (!canPost(ctx.classRole)) throw new ForbiddenError();
  await assertModuleInClass(ctx, moduleId);

  const q = await ctx.db.query.questions.findFirst({
    where: and(eq(questions.id, questionId), eq(questions.examModuleId, moduleId)),
  });
  if (!q) throw new ForbiddenError("Câu hỏi không tồn tại.");
  await ctx.db.delete(questions).where(eq(questions.id, questionId));
}

/** Nhập đề module bằng CSV — 27 câu mỗi module không ai gõ tay nổi. */
export async function importExamQuestions(
  ctx: ClassContext,
  moduleId: string,
  rows: ImportRow[],
): Promise<ImportResult> {
  if (!canPost(ctx.classRole)) throw new ForbiddenError();
  await assertModuleInClass(ctx, moduleId);

  const errors: ImportResult["errors"] = [];
  let created = 0;

  for (const [i, row] of rows.entries()) {
    try {
      const type = row.type.trim().toLowerCase();
      if (type !== "mcq" && type !== "grid_in" && type !== "free_text") {
        throw new Error(`Loại câu "${row.type}" không hợp lệ (mcq / grid_in / free_text).`);
      }
      const choices = row.choices
        .map((text, idx) => ({ key: String.fromCharCode(65 + idx), text: text.trim() }))
        .filter((c) => c.text !== "");

      await createExamQuestion(ctx, moduleId, {
        type,
        prompt: row.prompt,
        choices: type === "mcq" ? choices : null,
        correctAnswer: row.correct,
        points: row.points ? Number(row.points) : 1,
        domain: row.domain,
        skillTag: row.skill,
        explanation: row.explanation,
      });
      created++;
    } catch (e) {
      errors.push({ line: i + 1, message: e instanceof Error ? e.message : "Lỗi không rõ." });
    }
  }
  return { created, errors };
}
