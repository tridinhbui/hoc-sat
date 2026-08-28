import { beforeAll, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";

import * as schema from "@/db/schema";
import { ForbiddenError } from "@/lib/auth/policy";
import type { AuthContext, ClassContext } from "@/lib/auth/guard";
import {
  autoSubmitExpired,
  createExam,
  deleteExam,
  enterExam,
  examMonitor,
  finalizeAttempt,
  listExamQuestionsForStudent,
  logProctorEvent,
  saveExamAnswer,
  startModule,
  submitModule,
  voidAttempt,
} from "@/lib/repo/exams";

/* ------------------------------------------------------------------ *
 * Thi & lockdown.
 *
 * Đây là phần có động cơ gian lận cao nhất trong cả hệ thống, nên test
 * tập trung vào đúng ba câu hỏi:
 *   1. Đồng hồ có mua thêm được giây nào không?
 *   2. Đáp án có rò ra khi đang thi không?
 *   3. Đóng máy giữa chừng thì bài có bị treo mãi không?
 * ------------------------------------------------------------------ */

const db = drizzle(env.DB, { schema });
const C = "exc1";

const authFor = (userId: string, role: "teacher" | "student") =>
  ({ user: { id: userId, role }, db }) as unknown as AuthContext;

const ctxFor = (userId: string, classRole: "teacher" | "ta" | "student", classId = C) =>
  ({
    user: { id: userId, role: classRole === "student" ? "student" : classRole },
    db,
    classId,
    classRole,
    klass: { id: classId },
  }) as unknown as ClassContext;

const teacher = () => ctxFor("ext", "teacher");
const ta = () => ctxFor("exa", "ta");
const student = () => ctxFor("exs", "student");
const student2 = () => ctxFor("exs2", "student");

const OPEN = new Date("2026-10-01T08:00:00+07:00");
const CLOSE = new Date("2026-10-01T12:00:00+07:00");
/** Trong giờ thi — dùng làm "bây giờ" cho hầu hết các bước. */
const DURING = new Date("2026-10-01T08:05:00+07:00");

beforeAll(async () => {
  const now = new Date();
  await db.insert(schema.user).values([
    { id: "ext", name: "GV", email: "ext@t.vn", role: "teacher", createdAt: now, updatedAt: now },
    { id: "exa", name: "TA", email: "exa@t.vn", role: "ta", createdAt: now, updatedAt: now },
    { id: "exs", name: "HS A", email: "exs@t.vn", role: "student", createdAt: now, updatedAt: now },
    { id: "exs2", name: "HS B", email: "exs2@t.vn", role: "student", createdAt: now, updatedAt: now },
  ]);
  await db.insert(schema.classes).values({
    id: C, name: "Lớp thi", code: "EXM111", subject: "math", teacherId: "ext", createdAt: now,
  });
  await db.insert(schema.classMembers).values([
    { id: "excm1", classId: C, userId: "ext", role: "teacher", joinedAt: now },
    { id: "excm2", classId: C, userId: "exa", role: "ta", joinedAt: now },
    { id: "excm3", classId: C, userId: "exs", role: "student", joinedAt: now },
    { id: "excm4", classId: C, userId: "exs2", role: "student", joinedAt: now },
  ]);
});

/** Đề 2 module Math (preset 35 phút / 22 câu), mỗi module 1 câu để test nhanh. */
async function makeExam(title: string, opts?: { violationLimit?: number; closeAt?: Date }) {
  const examId = await createExam(teacher(), {
    title,
    kind: "midterm",
    openAt: OPEN,
    closeAt: opts?.closeAt ?? CLOSE,
    lockdown: true,
    violationLimit: opts?.violationLimit ?? 3,
    modules: [{ subject: "math" }, { subject: "math" }],
  });

  const mods = await db.query.examModules.findMany({
    where: eq(schema.examModules.examId, examId),
    orderBy: (m, { asc }) => [asc(m.orderIndex)],
  });

  const qs: string[] = [];
  for (const m of mods) {
    qs.push(
      await createQuestionInModule(m.id, `Câu của ${m.name}`),
    );
  }
  return { examId, mods, qs };
}

/** createQuestion của repo questions gắn vào assignment; module thi thì insert thẳng. */
async function createQuestionInModule(moduleId: string, prompt: string) {
  const id = crypto.randomUUID();
  await db.insert(schema.questions).values({
    id,
    examModuleId: moduleId,
    orderIndex: 0,
    prompt,
    type: "mcq",
    choices: [
      { key: "A", text: "sai" },
      { key: "B", text: "đúng" },
    ],
    correctAnswer: "B",
    explanation: "Vì B đúng.",
    points: 1,
    createdAt: new Date(),
  });
  return id;
}

describe("Soạn đề thi", () => {
  it("preset SAT đúng: Math 35 phút / 22 câu", async () => {
    const { mods } = await makeExam("Preset");
    expect(mods[0]).toMatchObject({ durationMinutes: 35, questionCount: 22, subject: "math" });
  });

  it("TA không tạo và không xoá được đề thi", async () => {
    const base = {
      title: "TA thử tạo",
      kind: "midterm" as const,
      openAt: OPEN,
      closeAt: CLOSE,
      lockdown: true,
      violationLimit: 3,
      modules: [{ subject: "math" as const }],
    };
    await expect(createExam(ta(), base)).rejects.toThrow(ForbiddenError);

    const { examId } = await makeExam("Chỉ GV xoá");
    await expect(deleteExam(ta(), examId)).rejects.toThrow(ForbiddenError);
    await expect(deleteExam(teacher(), examId)).resolves.toBeUndefined();
  });

  it("giờ đóng phải sau giờ mở", async () => {
    await expect(
      createExam(teacher(), {
        title: "Ngược giờ",
        kind: "final",
        openAt: CLOSE,
        closeAt: OPEN,
        lockdown: true,
        violationLimit: 3,
        modules: [{ subject: "rw" }],
      }),
    ).rejects.toThrow();
  });
});

describe("Vào phòng thi", () => {
  it("chưa tới giờ hoặc đã đóng ca thì không vào được", async () => {
    const { examId } = await makeExam("Cửa giờ");
    await expect(
      enterExam(student(), examId, { now: new Date("2026-10-01T07:59:00+07:00") }),
    ).rejects.toThrow(ForbiddenError);
    await expect(
      enterExam(student(), examId, { now: new Date("2026-10-01T12:01:00+07:00") }),
    ).rejects.toThrow(ForbiddenError);
    await expect(enterExam(student(), examId, { now: DURING })).resolves.toBeTruthy();
  });

  it("giáo viên không vào thi thay học sinh", async () => {
    const { examId } = await makeExam("GV không thi");
    await expect(enterExam(teacher(), examId, { now: DURING })).rejects.toThrow(ForbiddenError);
  });
});

describe("Đồng hồ do server quyết", () => {
  it("expires_at = giờ bắt đầu + thời lượng module, tính ở server", async () => {
    const { examId, mods } = await makeExam("Đồng hồ");
    const { attempt } = await enterExam(student(), examId, { now: DURING });
    const ma = await startModule(student(), attempt.id, mods[0].id, { now: DURING });

    expect(ma.expiresAt!.getTime()).toBe(DURING.getTime() + 35 * 60_000);
  });

  it("bấm bắt đầu lại KHÔNG gia hạn thêm giây nào", async () => {
    const { examId, mods } = await makeExam("Không gia hạn");
    const { attempt } = await enterExam(student(), examId, { now: DURING });

    const first = await startModule(student(), attempt.id, mods[0].id, { now: DURING });
    const later = new Date(DURING.getTime() + 10 * 60_000);
    const second = await startModule(student(), attempt.id, mods[0].id, { now: later });

    expect(second.expiresAt!.getTime()).toBe(first.expiresAt!.getTime());
  });

  it("không nhảy cóc sang module sau khi chưa nộp module trước", async () => {
    const { examId, mods } = await makeExam("Không nhảy cóc");
    const { attempt } = await enterExam(student(), examId, { now: DURING });

    await expect(
      startModule(student(), attempt.id, mods[1].id, { now: DURING }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("hết giờ thì server từ chối ghi đáp án", async () => {
    const { examId, mods, qs } = await makeExam("Hết giờ");
    const { attempt } = await enterExam(student(), examId, { now: DURING });
    await startModule(student(), attempt.id, mods[0].id, { now: DURING });

    const inTime = new Date(DURING.getTime() + 30 * 60_000);
    const tooLate = new Date(DURING.getTime() + 36 * 60_000);

    await expect(
      saveExamAnswer(
        student(),
        { attemptId: attempt.id, moduleId: mods[0].id, questionId: qs[0], response: "B" },
        { now: inTime },
      ),
    ).resolves.toBeUndefined();

    await expect(
      saveExamAnswer(
        student(),
        { attemptId: attempt.id, moduleId: mods[0].id, questionId: qs[0], response: "A" },
        { now: tooLate },
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it("giờ hết module không bao giờ vượt quá giờ đóng ca thi", async () => {
    // Ca thi chỉ còn 10 phút nhưng module dài 35 phút.
    const closeSoon = new Date(DURING.getTime() + 10 * 60_000);
    const { examId, mods } = await makeExam("Ca ngắn", { closeAt: closeSoon });
    const { attempt } = await enterExam(student(), examId, { now: DURING });
    const ma = await startModule(student(), attempt.id, mods[0].id, { now: DURING });

    expect(ma.expiresAt!.getTime()).toBe(closeSoon.getTime());
  });

  it("module đã nộp thì không sửa đáp án được nữa", async () => {
    const { examId, mods, qs } = await makeExam("Khoá sau nộp module");
    const { attempt } = await enterExam(student(), examId, { now: DURING });
    await startModule(student(), attempt.id, mods[0].id, { now: DURING });
    await submitModule(student(), attempt.id, mods[0].id, { now: DURING });

    await expect(
      saveExamAnswer(
        student(),
        { attemptId: attempt.id, moduleId: mods[0].id, questionId: qs[0], response: "B" },
        { now: DURING },
      ),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe("Không rò đáp án khi đang thi", () => {
  it("đề gửi cho học sinh không có correctAnswer và explanation", async () => {
    const { mods } = await makeExam("Giấu đáp án thi");
    const qs = await listExamQuestionsForStudent(student(), mods[0].id);

    expect(qs).toHaveLength(1);
    expect(Object.hasOwn(qs[0], "correctAnswer")).toBe(false);
    expect(Object.hasOwn(qs[0], "explanation")).toBe(false);
    expect(qs[0].choices).toHaveLength(2);
  });

  it("không ghi đáp án vào lượt thi của người khác", async () => {
    const { examId, mods, qs } = await makeExam("Bài của tôi");
    const { attempt } = await enterExam(student(), examId, { now: DURING });
    await startModule(student(), attempt.id, mods[0].id, { now: DURING });

    await expect(
      saveExamAnswer(
        student2(),
        { attemptId: attempt.id, moduleId: mods[0].id, questionId: qs[0], response: "B" },
        { now: DURING },
      ),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe("Giám sát và vi phạm", () => {
  it("copy/chuột phải chỉ ghi log, không cộng vi phạm", async () => {
    const { examId } = await makeExam("Log mềm");
    const { attempt } = await enterExam(student(), examId, { now: DURING });

    const r1 = await logProctorEvent(student(), attempt.id, "copy", undefined, { now: DURING });
    const r2 = await logProctorEvent(student(), attempt.id, "contextmenu", undefined, { now: DURING });

    expect(r1.violationCount).toBe(0);
    expect(r2.violationCount).toBe(0);
  });

  it("thoát toàn màn hình quá ngưỡng thì bị nộp ép — nhưng vẫn được CHẤM", async () => {
    const { examId, mods, qs } = await makeExam("Vượt ngưỡng", { violationLimit: 2 });
    const { attempt } = await enterExam(student(), examId, { now: DURING });
    await startModule(student(), attempt.id, mods[0].id, { now: DURING });
    await saveExamAnswer(
      student(),
      { attemptId: attempt.id, moduleId: mods[0].id, questionId: qs[0], response: "B" },
      { now: DURING },
    );

    const first = await logProctorEvent(student(), attempt.id, "fullscreen_exit", undefined, { now: DURING });
    expect(first).toMatchObject({ violationCount: 1, exceeded: false });

    const second = await logProctorEvent(student(), attempt.id, "visibility_hidden", undefined, { now: DURING });
    expect(second).toMatchObject({ violationCount: 2, exceeded: true });

    const after = await db.query.examAttempts.findFirst({
      where: eq(schema.examAttempts.id, attempt.id),
    });
    expect(after?.status).toBe("auto_submitted");
    // Máy không huỷ bài — quyết định huỷ là của giáo viên.
    expect(after?.totalScore).toBe(1);
  });

  it("màn giám sát liệt kê đủ cả lớp, học sinh không xem được", async () => {
    const { examId } = await makeExam("Màn giám sát");
    await enterExam(student(), examId, { now: DURING });

    await expect(examMonitor(student(), examId)).rejects.toThrow(ForbiddenError);

    const rows = await examMonitor(teacher(), examId);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.studentId === "exs2")?.status).toBe("not_started");
  });

  it("chỉ giáo viên huỷ được lượt thi", async () => {
    const { examId } = await makeExam("Huỷ lượt");
    const { attempt } = await enterExam(student(), examId, { now: DURING });

    await expect(voidAttempt(ta(), attempt.id)).rejects.toThrow(ForbiddenError);
    await expect(voidAttempt(teacher(), attempt.id)).resolves.toBeUndefined();

    // Đã huỷ thì không vào lại được.
    await expect(enterExam(student(), examId, { now: DURING })).rejects.toThrow(ForbiddenError);
  });
});

describe("Đóng máy giữa chừng", () => {
  it("cron tự nộp lượt đã hết giờ, không phụ thuộc trình duyệt", async () => {
    const { examId, mods, qs } = await makeExam("Bỏ máy");
    const { attempt } = await enterExam(student(), examId, { now: DURING });
    await startModule(student(), attempt.id, mods[0].id, { now: DURING });
    await saveExamAnswer(
      student(),
      { attemptId: attempt.id, moduleId: mods[0].id, questionId: qs[0], response: "B" },
      { now: DURING },
    );

    // Trước khi hết giờ: cron không đụng vào.
    await autoSubmitExpired(authFor("ext", "teacher"), new Date(DURING.getTime() + 10 * 60_000));
    let row = await db.query.examAttempts.findFirst({
      where: eq(schema.examAttempts.id, attempt.id),
    });
    expect(row?.status).toBe("in_progress");

    // Sau khi hết giờ module: cron chốt và chấm.
    const n = await autoSubmitExpired(
      authFor("ext", "teacher"),
      new Date(DURING.getTime() + 40 * 60_000),
    );
    expect(n).toBeGreaterThanOrEqual(1);

    row = await db.query.examAttempts.findFirst({
      where: eq(schema.examAttempts.id, attempt.id),
    });
    expect(row?.status).toBe("auto_submitted");
    expect(row?.totalScore).toBe(1);
  });

  it("chấm lại lượt đã chốt là no-op, không cộng điểm hai lần", async () => {
    const { examId, mods, qs } = await makeExam("Không chấm hai lần");
    const { attempt } = await enterExam(student(), examId, { now: DURING });
    await startModule(student(), attempt.id, mods[0].id, { now: DURING });
    await saveExamAnswer(
      student(),
      { attemptId: attempt.id, moduleId: mods[0].id, questionId: qs[0], response: "B" },
      { now: DURING },
    );

    await finalizeAttempt(authFor("ext", "teacher"), attempt.id, "submitted", DURING);
    const again = await finalizeAttempt(authFor("ext", "teacher"), attempt.id, "submitted", DURING);
    expect(again).toBeNull();

    const row = await db.query.examAttempts.findFirst({
      where: eq(schema.examAttempts.id, attempt.id),
    });
    expect(row?.totalScore).toBe(1);
  });

  it("câu bỏ trống vẫn được ghi là sai khi chốt bài", async () => {
    const { examId, mods, qs } = await makeExam("Bỏ trống khi thi");
    const { attempt } = await enterExam(student(), examId, { now: DURING });
    await startModule(student(), attempt.id, mods[0].id, { now: DURING });
    await finalizeAttempt(authFor("ext", "teacher"), attempt.id, "submitted", DURING);

    const rows = await db.query.answers.findMany({
      where: eq(schema.answers.attemptId, attempt.id),
    });
    expect(rows).toHaveLength(qs.length);
    expect(rows.every((r) => r.isCorrect === false)).toBe(true);
  });
});

describe("Chốt bài kiểu lazy", () => {
  it("vào lại sau khi hết giờ thì bài được chốt và chấm ngay", async () => {
    const { examId, mods, qs } = await makeExam("Vào lại sau giờ");
    const { attempt } = await enterExam(student(), examId, { now: DURING });
    await startModule(student(), attempt.id, mods[0].id, { now: DURING });
    await saveExamAnswer(
      student(),
      { attemptId: attempt.id, moduleId: mods[0].id, questionId: qs[0], response: "B" },
      { now: DURING },
    );

    // Học sinh đóng máy, quay lại sau khi module đã hết giờ.
    const after = new Date(DURING.getTime() + 40 * 60_000);
    const again = await enterExam(student(), examId, { now: after });

    expect(again.attempt.status).toBe("auto_submitted");
    expect(again.attempt.totalScore).toBe(1);
  });

  it("giáo viên mở màn giám sát thì các lượt treo được chốt luôn", async () => {
    const { examId, mods } = await makeExam("Giám sát chốt hộ");
    const { attempt } = await enterExam(student(), examId, { now: DURING });
    await startModule(student(), attempt.id, mods[0].id, { now: DURING });

    // examMonitor gọi autoSubmitExpired ở thời điểm thực; ép hết giờ bằng
    // cách kéo expires_at về quá khứ.
    await db
      .update(schema.moduleAttempts)
      .set({ expiresAt: new Date(Date.now() - 60_000) })
      .where(eq(schema.moduleAttempts.attemptId, attempt.id));

    const rows = await examMonitor(teacher(), examId);
    const mine = rows.find((r) => r.attemptId === attempt.id);
    expect(mine?.status).toBe("auto_submitted");
  });
});
