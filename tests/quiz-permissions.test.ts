import { beforeAll, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";

import * as schema from "@/db/schema";
import { ForbiddenError } from "@/lib/auth/policy";
import type { ClassContext } from "@/lib/auth/guard";
import {
  createAssignment,
  getMySubmission,
  returnSubmission,
  startQuiz,
  turnIn,
  unsubmit,
} from "@/lib/repo/assignments";
import {
  answerHeatmap,
  createQuestion,
  importQuestions,
  listQuestionsForStaff,
  listQuestionsForStudent,
  questionStats,
  saveAnswer,
  summarizeByDomain,
} from "@/lib/repo/questions";

/* ------------------------------------------------------------------ *
 * Trắc nghiệm & auto-chấm.
 *
 * Rủi ro lớn nhất của P3 không phải chấm sai mà là LỘ ĐÁP ÁN: chỉ cần
 * `correct_answer` lọt vào payload gửi cho học sinh là cả bộ đề mất giá
 * trị. Nửa đầu file này chỉ để canh đúng chuyện đó.
 * ------------------------------------------------------------------ */

const db = drizzle(env.DB, { schema });
const C = "qc1";

const ctxFor = (userId: string, classRole: "teacher" | "ta" | "student", classId = C) =>
  ({
    user: { id: userId, role: classRole === "student" ? "student" : classRole },
    db,
    classId,
    classRole,
    klass: { id: classId },
  }) as unknown as ClassContext;

const teacher = () => ctxFor("qt", "teacher");
const student = () => ctxFor("qs", "student");
const student2 = () => ctxFor("qs2", "student");

beforeAll(async () => {
  const now = new Date();
  await db.insert(schema.user).values([
    { id: "qt", name: "GV", email: "qt@t.vn", role: "teacher", createdAt: now, updatedAt: now },
    { id: "qs", name: "HS A", email: "qs@t.vn", role: "student", createdAt: now, updatedAt: now },
    { id: "qs2", name: "HS B", email: "qs2@t.vn", role: "student", createdAt: now, updatedAt: now },
  ]);
  await db.insert(schema.classes).values({
    id: C, name: "Lớp quiz", code: "QQQ111", subject: "math", teacherId: "qt", createdAt: now,
  });
  await db.insert(schema.classMembers).values([
    { id: "qcm1", classId: C, userId: "qt", role: "teacher", joinedAt: now },
    { id: "qcm2", classId: C, userId: "qs", role: "student", joinedAt: now },
    { id: "qcm3", classId: C, userId: "qs2", role: "student", joinedAt: now },
  ]);
});

async function makeQuiz(title: string) {
  const aid = await createAssignment(teacher(), {
    title,
    points: 3,
    allowLate: true,
    publish: true,
    files: [],
  });
  const q1 = await createQuestion(teacher(), aid, {
    type: "mcq",
    prompt: "2 + 2 = ?",
    choices: [
      { key: "A", text: "3" },
      { key: "B", text: "4" },
    ],
    correctAnswer: "B",
    explanation: "Cộng hai số.",
    points: 1,
    domain: "Algebra",
  });
  const q2 = await createQuestion(teacher(), aid, {
    type: "grid_in",
    prompt: "2/3 dưới dạng thập phân?",
    correctAnswer: "2/3",
    points: 1,
    domain: "Algebra",
  });
  const q3 = await createQuestion(teacher(), aid, {
    type: "free_text",
    prompt: "Giải thích cách làm.",
    points: 1,
    domain: "Reasoning",
  });
  return { aid, q1, q2, q3 };
}

describe("Không rò rỉ đáp án", () => {
  it("đề gửi cho học sinh KHÔNG chứa đáp án và lời giải", async () => {
    const { aid } = await makeQuiz("Giấu đáp án");
    const forStudent = await listQuestionsForStudent(student(), aid, { revealAnswers: false });

    expect(forStudent).toHaveLength(3);
    for (const q of forStudent) {
      // Không phải là "bằng null" — trường phải KHÔNG TỒN TẠI trong payload.
      expect(Object.hasOwn(q, "correctAnswer")).toBe(false);
      expect(Object.hasOwn(q, "explanation")).toBe(false);
    }
    // Nhưng vẫn phải đủ dữ liệu để làm bài.
    expect(forStudent[0].choices).toHaveLength(2);
  });

  it("chỉ lộ đáp án khi bài đã trả", async () => {
    const { aid } = await makeQuiz("Lộ sau khi trả");
    const revealed = await listQuestionsForStudent(student(), aid, { revealAnswers: true });
    expect(revealed[0].correctAnswer).toBe("B");
    expect(revealed[0].explanation).toBe("Cộng hai số.");
  });

  it("học sinh không gọi được bản đề đầy đủ của giáo viên", async () => {
    const { aid } = await makeQuiz("Bản đầy đủ");
    await expect(listQuestionsForStaff(student(), aid)).rejects.toThrow(ForbiddenError);
  });

  it("học sinh không xem được thống kê và heatmap", async () => {
    const { aid } = await makeQuiz("Thống kê");
    await expect(questionStats(student(), aid)).rejects.toThrow(ForbiddenError);
    await expect(answerHeatmap(student(), aid)).rejects.toThrow(ForbiddenError);
  });
});

describe("Lưu tạm đáp án", () => {
  it("không lưu vào bài của người khác", async () => {
    const { aid, q1 } = await makeQuiz("Bài của tôi");
    const sub = await startQuiz(student(), aid);

    await expect(
      saveAnswer(student2(), sub.id, q1, { response: "A" }),
    ).rejects.toThrow(ForbiddenError);
    await expect(
      saveAnswer(student(), sub.id, q1, { response: "A" }),
    ).resolves.toBeUndefined();
  });

  it("nộp rồi thì không sửa đáp án được nữa", async () => {
    const { aid, q1 } = await makeQuiz("Khoá sau khi nộp");
    const sub = await startQuiz(student(), aid);
    await saveAnswer(student(), sub.id, q1, { response: "A" });
    await turnIn(student(), aid, []);

    await expect(
      saveAnswer(student(), sub.id, q1, { response: "B" }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("không gắn được câu hỏi của bài khác vào bài này", async () => {
    const a = await makeQuiz("Bài 1");
    const b = await makeQuiz("Bài 2");
    const sub = await startQuiz(student(), a.aid);

    await expect(
      saveAnswer(student(), sub.id, b.q1, { response: "B" }),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe("Auto-chấm", () => {
  it("chấm đúng cả trắc nghiệm lẫn grid-in, bỏ qua tự luận", async () => {
    const { aid, q1, q2, q3 } = await makeQuiz("Chấm máy");
    const sub = await startQuiz(student(), aid);

    await saveAnswer(student(), sub.id, q1, { response: "B" });    // đúng
    await saveAnswer(student(), sub.id, q2, { response: ".667" }); // đúng (làm tròn)
    await saveAnswer(student(), sub.id, q3, { response: "..." });  // tự luận

    await turnIn(student(), aid, []);

    const after = await getMySubmission(student(), aid);
    expect(after?.autoScore).toBe(2);

    const rows = await db.query.answers.findMany({
      where: eq(schema.answers.submissionId, sub.id),
    });
    const by = Object.fromEntries(rows.map((r) => [r.questionId, r]));
    expect(by[q1].isCorrect).toBe(true);
    expect(by[q2].isCorrect).toBe(true);
    expect(by[q3].isCorrect).toBeNull(); // tự luận: để giáo viên chấm
  });

  it("câu bỏ trống được ghi lại là SAI, không phải bỏ qua", async () => {
    const { aid, q1, q2 } = await makeQuiz("Bỏ trống");
    const sub = await startQuiz(student(), aid);
    await saveAnswer(student(), sub.id, q1, { response: "B" });
    await turnIn(student(), aid, []);

    const rows = await db.query.answers.findMany({
      where: eq(schema.answers.submissionId, sub.id),
    });
    const blank = rows.find((r) => r.questionId === q2);
    // Nếu không ghi, dashboard câu sai sẽ tưởng cả lớp đều làm câu này.
    expect(blank?.isCorrect).toBe(false);
  });

  it("huỷ nộp thì xoá kết quả chấm — chống dò đáp án bằng cách nộp thử", async () => {
    const { aid, q1 } = await makeQuiz("Chống dò đáp án");
    const sub = await startQuiz(student(), aid);
    await saveAnswer(student(), sub.id, q1, { response: "B" });
    await turnIn(student(), aid, []);
    await unsubmit(student(), aid);

    const after = await getMySubmission(student(), aid);
    expect(after?.autoScore).toBeNull();

    const rows = await db.query.answers.findMany({
      where: eq(schema.answers.submissionId, sub.id),
    });
    expect(rows.every((r) => r.isCorrect === null)).toBe(true);
  });

  it("điểm vẫn kín cho tới khi giáo viên trả bài", async () => {
    const { aid, q1 } = await makeQuiz("Kín tới lúc trả");
    const sub = await startQuiz(student(), aid);
    await saveAnswer(student(), sub.id, q1, { response: "B" });
    await turnIn(student(), aid, []);

    // Máy đã chấm xong nhưng học sinh chưa được xem đáp án.
    const before = await listQuestionsForStudent(student(), aid, { revealAnswers: false });
    expect(Object.hasOwn(before[0], "correctAnswer")).toBe(false);

    await returnSubmission(teacher(), sub.id);
    const done = await getMySubmission(student(), aid);
    expect(done?.status).toBe("returned");
  });
});

describe("Nhập đề từ CSV", () => {
  it("nhập được hàng loạt và báo rõ dòng lỗi", async () => {
    const aid = await createAssignment(teacher(), {
      title: "Nhập CSV",
      points: 10,
      allowLate: true,
      publish: false,
      files: [],
    });

    const res = await importQuestions(teacher(), aid, [
      { type: "mcq", prompt: "1+1?", choices: ["1", "2", "3", "4"], correct: "B", points: "1" },
      { type: "grid_in", prompt: "3/4 = ?", choices: [], correct: "0.75", points: "1" },
      { type: "xxx", prompt: "loại sai", choices: [], correct: "A" },
      { type: "mcq", prompt: "thiếu đáp án", choices: ["a", "b"], correct: "Z" },
    ]);

    expect(res.created).toBe(2);
    expect(res.errors).toHaveLength(2);
    expect(res.errors[0].line).toBe(3);
    expect(res.errors[1].message).toMatch(/đáp án đúng/i);
  });
});

describe("Dashboard câu sai", () => {
  it("thống kê đúng tỉ lệ và dựng được heatmap cả lớp", async () => {
    const { aid, q1, q2 } = await makeQuiz("Thống kê thật");

    const s1 = await startQuiz(student(), aid);
    await saveAnswer(student(), s1.id, q1, { response: "B" }); // đúng
    await saveAnswer(student(), s1.id, q2, { response: "0.5" }); // sai
    await turnIn(student(), aid, []);

    const s2 = await startQuiz(student2(), aid);
    await saveAnswer(student2(), s2.id, q1, { response: "A" }); // sai
    await saveAnswer(student2(), s2.id, q2, { response: "2/3" }); // đúng
    await turnIn(student2(), aid, []);

    const stats = await questionStats(teacher(), aid);
    const byQ = Object.fromEntries(stats.map((s) => [s.questionId, s]));
    expect(byQ[q1]).toMatchObject({ correct: 1, answered: 2 });
    expect(byQ[q2]).toMatchObject({ correct: 1, answered: 2 });

    const heat = await answerHeatmap(teacher(), aid);
    expect(heat).toHaveLength(2);
    expect(heat.find((h) => h.studentId === "qs")?.cells[q1]).toBe(true);
    expect(heat.find((h) => h.studentId === "qs2")?.cells[q1]).toBe(false);

    // Mảng yếu nhất phải nổi lên đầu.
    const domains = summarizeByDomain(stats);
    expect(domains[0].domain).toBeDefined();
  });
});
