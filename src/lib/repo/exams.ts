import "server-only";
import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  answers,
  classMembers,
  examAttempts,
  examModules,
  exams,
  moduleAttempts,
  proctorEvents,
  questions,
  user,
} from "@/db/schema";
import type { AuthContext, ClassContext } from "@/lib/auth/guard";
import { ForbiddenError, canGrade } from "@/lib/auth/policy";
import { gradeAnswer } from "@/lib/grading/normalize";
import {
  HARD_VIOLATIONS,
  MODULE_PRESETS,
  PROCTOR_EVENT_TYPES,
  type ExamKind,
  type ProctorEventType,
} from "@/lib/exam/types";

/* ------------------------------------------------------------------ *
 * Thi.
 *
 * Nguyên tắc bất di bất dịch: THỜI GIAN DO SERVER QUYẾT.
 * `module_attempts.expires_at` được tính khi học sinh bấm bắt đầu module
 * và không bao giờ nhận từ client. Client chỉ vẽ đồng hồ đếm ngược —
 * sửa đồng hồ đó không mua thêm được một giây nào, vì mọi lần ghi đáp án
 * đều đối chiếu lại với expires_at ở server.
 * ------------------------------------------------------------------ */

function assertStaff(ctx: ClassContext) {
  if (!canGrade(ctx.classRole)) throw new ForbiddenError();
}

function assertTeacher(ctx: ClassContext) {
  if (ctx.classRole !== "teacher") {
    throw new ForbiddenError("Chỉ giáo viên được tạo và mở đề thi.");
  }
}

/* ------------------------------ Soạn đề thi ------------------------------ */

export async function listExams(ctx: ClassContext) {
  const rows = await ctx.db.query.exams.findMany({
    where: eq(exams.classId, ctx.classId),
    orderBy: [desc(exams.openAt)],
  });
  if (rows.length === 0) return [];

  const mods = await ctx.db.query.examModules.findMany({
    where: inArray(examModules.examId, rows.map((r) => r.id)),
    orderBy: [asc(examModules.orderIndex)],
  });

  return rows.map((e) => ({ ...e, modules: mods.filter((m) => m.examId === e.id) }));
}

export async function getExam(ctx: ClassContext, examId: string) {
  const exam = await ctx.db.query.exams.findFirst({
    where: and(eq(exams.id, examId), eq(exams.classId, ctx.classId)),
  });
  if (!exam) throw new ForbiddenError("Đề thi không tồn tại.");

  const modules = await ctx.db.query.examModules.findMany({
    where: eq(examModules.examId, examId),
    orderBy: [asc(examModules.orderIndex)],
  });
  return { ...exam, modules };
}

/**
 * Tạo đề thi kèm các module. Mặc định dùng preset SAT
 * (Math 35 phút / 22 câu, RW 32 phút / 27 câu).
 */
export async function createExam(
  ctx: ClassContext,
  input: {
    title: string;
    kind: ExamKind;
    openAt: Date;
    closeAt: Date;
    lockdown: boolean;
    violationLimit: number;
    modules: { subject: "rw" | "math"; name?: string }[];
  },
) {
  assertTeacher(ctx);

  const title = input.title.trim();
  if (!title) throw new Error("Đề thi cần có tên.");
  if (input.closeAt <= input.openAt) throw new Error("Giờ đóng phải sau giờ mở.");
  if (input.modules.length === 0) throw new Error("Đề thi cần ít nhất một module.");
  if (input.violationLimit < 1) throw new Error("Ngưỡng vi phạm phải từ 1 trở lên.");

  const examId = crypto.randomUUID();
  const statements = [
    ctx.db.insert(exams).values({
      id: examId,
      classId: ctx.classId,
      title,
      kind: input.kind,
      openAt: input.openAt,
      closeAt: input.closeAt,
      lockdown: input.lockdown,
      violationLimit: input.violationLimit,
      createdBy: ctx.user.id,
    }),
    ...input.modules.map((m, i) => {
      const preset = MODULE_PRESETS[m.subject];
      return ctx.db.insert(examModules).values({
        id: crypto.randomUUID(),
        examId,
        orderIndex: i,
        name: m.name?.trim() || `${preset.name} — Module ${i + 1}`,
        subject: m.subject,
        durationMinutes: preset.durationMinutes,
        questionCount: preset.questionCount,
      });
    }),
  ];
  await ctx.db.batch(statements as [(typeof statements)[number], ...typeof statements]);
  return examId;
}

export async function deleteExam(ctx: ClassContext, examId: string) {
  assertTeacher(ctx);
  await getExam(ctx, examId);

  const [{ n } = { n: 0 }] = await ctx.db
    .select({ n: count() })
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.examId, examId),
        inArray(examAttempts.status, ["in_progress", "submitted", "auto_submitted"]),
      ),
    );
  if (n > 0) throw new ForbiddenError("Đã có học sinh vào thi, không xoá được đề này.");

  await ctx.db.delete(exams).where(eq(exams.id, examId));
}

/** Cho học sinh xem đáp án và lời giải sau khi kết thúc. */
export async function setReleased(ctx: ClassContext, examId: string, released: boolean) {
  assertTeacher(ctx);
  await getExam(ctx, examId);
  await ctx.db.update(exams).set({ released }).where(eq(exams.id, examId));
}

/* --------------------------- Câu hỏi của module --------------------------- */

export async function listModuleQuestionsForStaff(ctx: ClassContext, moduleId: string) {
  assertStaff(ctx);
  await assertModuleInClass(ctx, moduleId);
  return ctx.db.query.questions.findMany({
    where: eq(questions.examModuleId, moduleId),
    orderBy: [asc(questions.orderIndex)],
  });
}

async function assertModuleInClass(ctx: ClassContext, moduleId: string) {
  const [row] = await ctx.db
    .select({ module: examModules, exam: exams })
    .from(examModules)
    .innerJoin(exams, eq(exams.id, examModules.examId))
    .where(and(eq(examModules.id, moduleId), eq(exams.classId, ctx.classId)));
  if (!row) throw new ForbiddenError("Module không tồn tại trong lớp này.");
  return row;
}

/* ------------------------------ Vào phòng thi ------------------------------ */

type Now = { now: Date };

/** Học sinh mở phòng thi. Tạo lượt thi nếu chưa có. */
export async function enterExam(ctx: ClassContext, examId: string, { now }: Now = { now: new Date() }) {
  if (ctx.classRole !== "student") throw new ForbiddenError("Chỉ học sinh mới vào thi.");

  const exam = await getExam(ctx, examId);
  if (now < exam.openAt) throw new ForbiddenError("Chưa đến giờ thi.");
  if (now > exam.closeAt) throw new ForbiddenError("Ca thi đã đóng.");
  if (exam.modules.length === 0) throw new ForbiddenError("Đề thi chưa có module nào.");

  let attempt = await ctx.db.query.examAttempts.findFirst({
    where: and(eq(examAttempts.examId, examId), eq(examAttempts.studentId, ctx.user.id)),
  });

  if (!attempt) {
    const id = crypto.randomUUID();
    await ctx.db.insert(examAttempts).values({
      id,
      examId,
      studentId: ctx.user.id,
      status: "in_progress",
      startedAt: now,
      currentModuleId: exam.modules[0].id,
    });
    attempt = await ctx.db.query.examAttempts.findFirst({ where: eq(examAttempts.id, id) });
  }

  if (attempt!.status === "voided") throw new ForbiddenError("Lượt thi của bạn đã bị huỷ.");

  // Vào lại sau khi đã hết giờ: chốt và chấm ngay tại đây thay vì cho
  // học sinh thấy một phòng thi còn mở nhưng không ghi được gì.
  if (attempt!.status === "in_progress") {
    const stillOpen = await ctx.db.query.moduleAttempts.findFirst({
      where: and(
        eq(moduleAttempts.attemptId, attempt!.id),
        isNull(moduleAttempts.submittedAt),
      ),
    });
    if (stillOpen?.expiresAt && now > stillOpen.expiresAt) {
      await finalizeAttempt(ctx, attempt!.id, "auto_submitted", now);
      attempt = await ctx.db.query.examAttempts.findFirst({
        where: eq(examAttempts.id, attempt!.id),
      });
    }
  }

  return { exam, attempt: attempt! };
}

/**
 * Bắt đầu một module. `expires_at` tính TẠI ĐÂY, ở server.
 * Gọi lại lần nữa không gia hạn — trả về đúng mốc đã chốt lần đầu.
 */
export async function startModule(
  ctx: ClassContext,
  attemptId: string,
  moduleId: string,
  { now }: Now = { now: new Date() },
) {
  const attempt = await loadMyAttempt(ctx, attemptId);
  const { module, exam } = await assertModuleInClass(ctx, moduleId);
  if (module.examId !== attempt.examId) throw new ForbiddenError("Module không thuộc đề này.");
  if (attempt.status !== "in_progress") throw new ForbiddenError("Lượt thi đã kết thúc.");

  const existing = await ctx.db.query.moduleAttempts.findFirst({
    where: and(
      eq(moduleAttempts.attemptId, attemptId),
      eq(moduleAttempts.moduleId, moduleId),
    ),
  });
  if (existing) return existing;

  // Không cho quay lại module đã nộp, và không cho nhảy cóc.
  if (attempt.currentModuleId !== moduleId) {
    throw new ForbiddenError("Chưa tới lượt module này.");
  }

  const expiresAt = new Date(
    Math.min(
      now.getTime() + module.durationMinutes * 60_000,
      // Không bao giờ vượt quá giờ đóng ca thi.
      exam.closeAt.getTime(),
    ),
  );

  const id = crypto.randomUUID();
  await ctx.db.insert(moduleAttempts).values({
    id,
    attemptId,
    moduleId,
    startedAt: now,
    expiresAt,
  });
  return (await ctx.db.query.moduleAttempts.findFirst({ where: eq(moduleAttempts.id, id) }))!;
}

async function loadMyAttempt(ctx: ClassContext, attemptId: string) {
  const attempt = await ctx.db.query.examAttempts.findFirst({
    where: eq(examAttempts.id, attemptId),
  });
  if (!attempt || attempt.studentId !== ctx.user.id) {
    throw new ForbiddenError("Đây không phải lượt thi của bạn.");
  }
  return attempt;
}

/** Đề gửi cho học sinh — KHÔNG kèm đáp án, kể cả khi đã nộp. */
export async function listExamQuestionsForStudent(ctx: ClassContext, moduleId: string) {
  const rows = await ctx.db
    .select({
      id: questions.id,
      orderIndex: questions.orderIndex,
      prompt: questions.prompt,
      imageR2Key: questions.imageR2Key,
      type: questions.type,
      choices: questions.choices,
      points: questions.points,
    })
    .from(questions)
    .where(eq(questions.examModuleId, moduleId))
    .orderBy(asc(questions.orderIndex));
  return rows;
}

/**
 * Ghi một đáp án trong lúc thi.
 * Hết giờ là hết — kiểm tra lại `expires_at` ở server mỗi lần ghi.
 */
export async function saveExamAnswer(
  ctx: ClassContext,
  input: { attemptId: string; moduleId: string; questionId: string; response: string | null; flagged?: boolean },
  { now }: Now = { now: new Date() },
) {
  const attempt = await loadMyAttempt(ctx, input.attemptId);
  if (attempt.status !== "in_progress") throw new ForbiddenError("Lượt thi đã kết thúc.");

  const ma = await ctx.db.query.moduleAttempts.findFirst({
    where: and(
      eq(moduleAttempts.attemptId, input.attemptId),
      eq(moduleAttempts.moduleId, input.moduleId),
    ),
  });
  if (!ma) throw new ForbiddenError("Chưa bắt đầu module này.");
  if (ma.submittedAt) throw new ForbiddenError("Module đã nộp, không sửa được nữa.");
  if (ma.expiresAt && now > ma.expiresAt) throw new ForbiddenError("Đã hết giờ module này.");

  const q = await ctx.db.query.questions.findFirst({ where: eq(questions.id, input.questionId) });
  if (!q || q.examModuleId !== input.moduleId) {
    throw new ForbiddenError("Câu hỏi không thuộc module này.");
  }

  const existing = await ctx.db.query.answers.findFirst({
    where: and(eq(answers.attemptId, input.attemptId), eq(answers.questionId, input.questionId)),
  });

  if (existing) {
    await ctx.db
      .update(answers)
      .set({
        response: input.response,
        flagged: input.flagged ?? existing.flagged,
        answeredAt: now,
      })
      .where(eq(answers.id, existing.id));
    return;
  }

  await ctx.db.insert(answers).values({
    id: crypto.randomUUID(),
    attemptId: input.attemptId,
    questionId: input.questionId,
    response: input.response,
    flagged: input.flagged ?? false,
    answeredAt: now,
  });
}

export async function listMyExamAnswers(ctx: ClassContext, attemptId: string) {
  await loadMyAttempt(ctx, attemptId);
  return ctx.db.query.answers.findMany({ where: eq(answers.attemptId, attemptId) });
}

/** Nộp một module và chuyển sang module kế. Không quay lại được. */
export async function submitModule(
  ctx: ClassContext,
  attemptId: string,
  moduleId: string,
  { now }: Now = { now: new Date() },
) {
  const attempt = await loadMyAttempt(ctx, attemptId);
  if (attempt.status !== "in_progress") throw new ForbiddenError("Lượt thi đã kết thúc.");

  const ma = await ctx.db.query.moduleAttempts.findFirst({
    where: and(eq(moduleAttempts.attemptId, attemptId), eq(moduleAttempts.moduleId, moduleId)),
  });
  if (!ma) throw new ForbiddenError("Chưa bắt đầu module này.");
  if (ma.submittedAt) return { done: false as const };

  const mods = await ctx.db.query.examModules.findMany({
    where: eq(examModules.examId, attempt.examId),
    orderBy: [asc(examModules.orderIndex)],
  });
  const idx = mods.findIndex((m) => m.id === moduleId);
  const next = mods[idx + 1];

  await ctx.db
    .update(moduleAttempts)
    .set({ submittedAt: now })
    .where(eq(moduleAttempts.id, ma.id));

  if (next) {
    await ctx.db
      .update(examAttempts)
      .set({ currentModuleId: next.id })
      .where(eq(examAttempts.id, attemptId));
    return { done: false as const, nextModuleId: next.id };
  }

  await finalizeAttempt(ctx, attemptId, "submitted", now);
  return { done: true as const };
}

/* ------------------------------ Chấm & kết thúc ------------------------------ */

/**
 * Chốt lượt thi: chấm toàn bộ đáp án rồi khoá lại.
 * Dùng chung cho nộp chủ động, hết giờ, và vi phạm quá ngưỡng.
 */
export async function finalizeAttempt(
  ctx: AuthContext,
  attemptId: string,
  status: "submitted" | "auto_submitted",
  now = new Date(),
) {
  const attempt = await ctx.db.query.examAttempts.findFirst({
    where: eq(examAttempts.id, attemptId),
  });
  if (!attempt || attempt.status !== "in_progress") return null;

  const mods = await ctx.db.query.examModules.findMany({
    where: eq(examModules.examId, attempt.examId),
  });
  const qs = mods.length
    ? await ctx.db.query.questions.findMany({
        where: inArray(questions.examModuleId, mods.map((m) => m.id)),
      })
    : [];

  const given = await ctx.db.query.answers.findMany({
    where: eq(answers.attemptId, attemptId),
  });
  const byQ = new Map(given.map((a) => [a.questionId, a]));

  let total = 0;
  const updates = [];

  for (const q of qs) {
    const a = byQ.get(q.id);
    const { isCorrect, pointsAwarded } = gradeAnswer(
      {
        type: q.type,
        correctAnswer: q.correctAnswer,
        acceptedAnswers: q.acceptedAnswers,
        points: q.points,
      },
      a?.response ?? null,
    );
    if (isCorrect === null) continue;

    total += pointsAwarded ?? 0;

    if (a) {
      updates.push(
        ctx.db.update(answers).set({ isCorrect, pointsAwarded }).where(eq(answers.id, a.id)),
      );
    } else {
      // Câu bỏ trống vẫn phải có dòng, nếu không thống kê đề thi sẽ đếm thiếu.
      updates.push(
        ctx.db.insert(answers).values({
          id: crypto.randomUUID(),
          attemptId,
          questionId: q.id,
          response: null,
          isCorrect: false,
          pointsAwarded: 0,
        }),
      );
    }
  }

  updates.push(
    ctx.db
      .update(moduleAttempts)
      .set({ submittedAt: now })
      .where(and(eq(moduleAttempts.attemptId, attemptId), isNull(moduleAttempts.submittedAt))),
    ctx.db
      .update(examAttempts)
      .set({ status, submittedAt: now, totalScore: total })
      .where(eq(examAttempts.id, attemptId)),
  );

  await ctx.db.batch(updates as [(typeof updates)[number], ...typeof updates]);
  return { totalScore: total };
}

/* ------------------------------ Giám sát ------------------------------ */

/**
 * Ghi một sự kiện giám sát. Trả về số lần vi phạm nặng tích luỹ và
 * cờ báo đã vượt ngưỡng (khi đó lượt thi bị nộp ép).
 */
export async function logProctorEvent(
  ctx: ClassContext,
  attemptId: string,
  type: ProctorEventType,
  meta?: Record<string, unknown>,
  { now }: Now = { now: new Date() },
) {
  const attempt = await loadMyAttempt(ctx, attemptId);
  if (!PROCTOR_EVENT_TYPES.includes(type)) throw new Error("Loại sự kiện không hợp lệ.");
  if (attempt.status !== "in_progress") {
    return { violationCount: attempt.violationCount, exceeded: false, limit: 0 };
  }

  const exam = await ctx.db.query.exams.findFirst({ where: eq(exams.id, attempt.examId) });
  const limit = exam?.violationLimit ?? 3;
  const hard = HARD_VIOLATIONS.includes(type);
  const violationCount = attempt.violationCount + (hard ? 1 : 0);

  await ctx.db.batch([
    ctx.db.insert(proctorEvents).values({
      id: crypto.randomUUID(),
      attemptId,
      type,
      occurredAt: now,
      meta: meta ?? null,
    }),
    ctx.db
      .update(examAttempts)
      .set({ violationCount })
      .where(eq(examAttempts.id, attemptId)),
  ]);

  const exceeded = hard && violationCount >= limit;
  if (exceeded) {
    // Vượt ngưỡng thì nộp ép ngay — nhưng vẫn CHẤM bài, không huỷ.
    // Quyết định huỷ là của giáo viên, không phải của máy.
    await finalizeAttempt(ctx, attemptId, "auto_submitted", now);
  }

  return { violationCount, exceeded, limit };
}

export type MonitorRow = {
  studentId: string;
  name: string;
  attemptId: string | null;
  status: string;
  startedAt: Date | null;
  submittedAt: Date | null;
  violationCount: number;
  totalScore: number | null;
  currentModuleName: string | null;
  expiresAt: Date | null;
  recentEvents: { type: string; occurredAt: Date }[];
};

/** Màn giám sát của giáo viên. */
export async function examMonitor(ctx: ClassContext, examId: string): Promise<MonitorRow[]> {
  assertStaff(ctx);
  const exam = await getExam(ctx, examId);

  // Chốt các lượt đã hết giờ trước khi hiển thị, để giáo viên không thấy
  // "đang làm bài" ở những em thực ra đã đóng máy từ lâu.
  await autoSubmitExpired(ctx);
  const modName = new Map(exam.modules.map((m) => [m.id, m.name]));

  const rows = await ctx.db
    .select({
      studentId: user.id,
      name: user.name,
      attemptId: examAttempts.id,
      status: examAttempts.status,
      startedAt: examAttempts.startedAt,
      submittedAt: examAttempts.submittedAt,
      violationCount: examAttempts.violationCount,
      totalScore: examAttempts.totalScore,
      currentModuleId: examAttempts.currentModuleId,
    })
    .from(classMembers)
    .innerJoin(user, eq(user.id, classMembers.userId))
    .leftJoin(
      examAttempts,
      and(eq(examAttempts.studentId, user.id), eq(examAttempts.examId, examId)),
    )
    .where(and(eq(classMembers.classId, ctx.classId), eq(classMembers.role, "student")))
    .orderBy(asc(user.name));

  const attemptIds = rows.map((r) => r.attemptId).filter((x): x is string => !!x);
  const [events, mas] = attemptIds.length
    ? await Promise.all([
        ctx.db.query.proctorEvents.findMany({
          where: inArray(proctorEvents.attemptId, attemptIds),
          orderBy: [desc(proctorEvents.occurredAt)],
          limit: 200,
        }),
        ctx.db.query.moduleAttempts.findMany({
          where: and(
            inArray(moduleAttempts.attemptId, attemptIds),
            isNull(moduleAttempts.submittedAt),
          ),
        }),
      ])
    : [[], []];

  return rows.map((r) => ({
    studentId: r.studentId,
    name: r.name,
    attemptId: r.attemptId,
    status: r.status ?? "not_started",
    startedAt: r.startedAt,
    submittedAt: r.submittedAt,
    violationCount: r.violationCount ?? 0,
    totalScore: r.totalScore,
    currentModuleName: r.currentModuleId ? (modName.get(r.currentModuleId) ?? null) : null,
    expiresAt: mas.find((m) => m.attemptId === r.attemptId)?.expiresAt ?? null,
    recentEvents: events
      .filter((e) => e.attemptId === r.attemptId)
      .slice(0, 5)
      .map((e) => ({ type: e.type, occurredAt: e.occurredAt })),
  }));
}

/** Giáo viên huỷ một lượt thi (bắt quả tang gian lận). */
export async function voidAttempt(ctx: ClassContext, attemptId: string) {
  assertTeacher(ctx);
  const [row] = await ctx.db
    .select({ attempt: examAttempts })
    .from(examAttempts)
    .innerJoin(exams, eq(exams.id, examAttempts.examId))
    .where(and(eq(examAttempts.id, attemptId), eq(exams.classId, ctx.classId)));
  if (!row) throw new ForbiddenError("Lượt thi không tồn tại trong lớp này.");

  await ctx.db
    .update(examAttempts)
    .set({ status: "voided", submittedAt: new Date() })
    .where(eq(examAttempts.id, attemptId));
}

/* ------------------------------ Cron ------------------------------ */

/**
 * Quét các lượt thi còn treo: hết giờ module cuối, hoặc ca thi đã đóng.
 *
 * Gọi theo kiểu LAZY, ngay khi có người đọc tới dữ liệu đó (giáo viên mở
 * màn giám sát, học sinh vào lại phòng thi). Không dùng cron vì worker
 * OpenNext sinh ra chỉ có handler `fetch`, không có `scheduled`.
 *
 * Điều này không làm mất tính đúng đắn: `expires_at` đã chặn mọi lần ghi
 * đáp án sau giờ, nên một lượt "treo" chỉ là dòng chưa được chấm chứ
 * không phải kẽ hở làm bài thêm. Nó được chấm ngay lần đầu có người nhìn.
 */
export async function autoSubmitExpired(ctx: AuthContext, now = new Date()) {
  const stale = await ctx.db
    .select({ id: examAttempts.id })
    .from(examAttempts)
    .innerJoin(exams, eq(exams.id, examAttempts.examId))
    .where(
      and(
        eq(examAttempts.status, "in_progress"),
        sql`(
          ${exams.closeAt} <= ${now.getTime()}
          OR NOT EXISTS (
            SELECT 1 FROM module_attempts ma
            WHERE ma.attempt_id = ${examAttempts.id}
              AND ma.submitted_at IS NULL
              AND ma.expires_at > ${now.getTime()}
          )
        )`,
      ),
    )
    .limit(200);

  let n = 0;
  for (const s of stale) {
    // Chỉ chốt lượt đã bắt đầu ít nhất một module; người mở phòng rồi bỏ đi
    // mà chưa bấm bắt đầu thì để cron sau xử lý khi ca thi đóng.
    const started = await ctx.db.query.moduleAttempts.findFirst({
      where: eq(moduleAttempts.attemptId, s.id),
    });
    const exam = await ctx.db
      .select({ closeAt: exams.closeAt })
      .from(examAttempts)
      .innerJoin(exams, eq(exams.id, examAttempts.examId))
      .where(eq(examAttempts.id, s.id));
    const closed = exam[0] && exam[0].closeAt <= now;

    if (!started && !closed) continue;
    await finalizeAttempt(ctx, s.id, "auto_submitted", now);
    n++;
  }
  return n;
}

/** Bảng điểm thi cho học sinh. */
export async function myExamResult(ctx: ClassContext, examId: string) {
  const attempt = await ctx.db.query.examAttempts.findFirst({
    where: and(eq(examAttempts.examId, examId), eq(examAttempts.studentId, ctx.user.id)),
  });
  if (!attempt) return null;

  const exam = await getExam(ctx, examId);
  const mods = exam.modules;
  const qs = mods.length
    ? await ctx.db.query.questions.findMany({
        where: inArray(questions.examModuleId, mods.map((m) => m.id)),
      })
    : [];
  const maxScore = qs.reduce((s, q) => s + q.points, 0);

  return { attempt, exam, maxScore, questionCount: qs.length };
}

export async function countdownFor(
  ctx: ClassContext,
  attemptId: string,
  moduleId: string,
): Promise<Date | null> {
  await loadMyAttempt(ctx, attemptId);
  const ma = await ctx.db.query.moduleAttempts.findFirst({
    where: and(eq(moduleAttempts.attemptId, attemptId), eq(moduleAttempts.moduleId, moduleId)),
  });
  return ma?.expiresAt ?? null;
}


/** Tra lớp chủ quản của một đề thi — dùng để dựng context cho phòng thi. */
export async function examClassOf(ctx: AuthContext, examId: string): Promise<string | null> {
  const row = await ctx.db.query.exams.findFirst({ where: eq(exams.id, examId) });
  return row?.classId ?? null;
}
