import { beforeAll, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "@/db/schema";
import { ForbiddenError } from "@/lib/auth/policy";
import type { AuthContext } from "@/lib/auth/guard";
import { buildPracticeSet, gradePractice, weakDomains } from "@/lib/repo/practice";

/* ------------------------------------------------------------------ *
 * Luyện tập cá nhân hoá.
 *
 * Hai thứ phải chắc: đáp án không rời server trước khi học sinh trả lời,
 * và biết id câu hỏi của lớp khác cũng không lấy được gì.
 * ------------------------------------------------------------------ */

const db = drizzle(env.DB, { schema });

const C1 = "pc1";
const C2 = "pc2";

const ctxFor = (userId: string, role: "teacher" | "student" = "student") =>
  ({ user: { id: userId, role }, db }) as unknown as AuthContext;

const an = () => ctxFor("ps1");
const binh = () => ctxFor("ps2");
const nguoiNgoai = () => ctxFor("pout");

beforeAll(async () => {
  const now = new Date();
  const ago = (n: number) => new Date(now.getTime() - n * 86_400_000);

  await db.insert(schema.user).values([
    { id: "pt1", name: "GV P", email: "pt1@test.vn", role: "teacher", createdAt: now, updatedAt: now },
    { id: "ps1", name: "An", email: "ps1@test.vn", role: "student", createdAt: now, updatedAt: now },
    { id: "ps2", name: "Bình", email: "ps2@test.vn", role: "student", createdAt: now, updatedAt: now },
    { id: "pout", name: "Ngoài", email: "pout@test.vn", role: "student", createdAt: now, updatedAt: now },
  ]);

  await db.insert(schema.classes).values([
    { id: C1, name: "Lớp P", code: "PRC111", subject: "math", teacherId: "pt1", createdAt: now },
    { id: C2, name: "Lớp Khác", code: "PRC222", subject: "rw", teacherId: "pt1", createdAt: now },
  ]);

  await db.insert(schema.classMembers).values([
    { id: "pcm1", classId: C1, userId: "pt1", role: "teacher", joinedAt: now },
    { id: "pcm2", classId: C1, userId: "ps1", role: "student", joinedAt: now },
    { id: "pcm3", classId: C1, userId: "ps2", role: "student", joinedAt: now },
    { id: "pcm4", classId: C2, userId: "pout", role: "student", joinedAt: now },
    // An cũng là TRỢ GIẢNG ở lớp C2 — không phải học sinh, nên đề lớp đó
    // không được vào bộ ôn của em.
    { id: "pcm5", classId: C2, userId: "ps1", role: "ta", joinedAt: now },
  ]);

  await db.insert(schema.assignments).values([
    { id: "pa1", classId: C1, authorId: "pt1", title: "Quiz 1", kind: "quiz", points: 10, publishedAt: ago(3), createdAt: ago(4) },
    // Bản nháp: câu bên trong không được lộ qua đường luyện tập.
    { id: "pa2", classId: C1, authorId: "pt1", title: "Nháp", kind: "quiz", points: 10, createdAt: ago(2) },
    { id: "pax", classId: C2, authorId: "pt1", title: "Quiz lớp khác", kind: "quiz", points: 10, publishedAt: ago(3), createdAt: ago(4) },
  ]);

  await db.insert(schema.questions).values([
    // Algebra: An sai 2 câu.
    { id: "pq1", assignmentId: "pa1", orderIndex: 0, prompt: "1+1?", type: "grid_in", correctAnswer: "2", explanation: "Cộng hai số.", points: 1, domain: "Algebra", createdAt: ago(4) },
    { id: "pq2", assignmentId: "pa1", orderIndex: 1, prompt: "2+2?", type: "grid_in", correctAnswer: "4", points: 1, domain: "Algebra", createdAt: ago(4) },
    // Algebra: câu An CHƯA gặp bao giờ.
    { id: "pq3", assignmentId: "pa1", orderIndex: 2, prompt: "3+3?", type: "grid_in", correctAnswer: "6", points: 1, domain: "Algebra", createdAt: ago(4) },
    // Geometry: An làm đúng.
    { id: "pq4", assignmentId: "pa1", orderIndex: 3, prompt: "Góc vuông bao nhiêu độ?", type: "mcq", choices: [{ key: "A", text: "90" }, { key: "B", text: "180" }], correctAnswer: "A", points: 1, domain: "Geometry", createdAt: ago(4) },
    // Tự luận: không tự chấm được nên không đưa vào bộ ôn.
    { id: "pq5", assignmentId: "pa1", orderIndex: 4, prompt: "Giải thích cách làm", type: "free_text", points: 1, domain: "Algebra", createdAt: ago(4) },
    // Câu trong bài nháp.
    { id: "pq6", assignmentId: "pa2", orderIndex: 0, prompt: "Câu nháp", type: "grid_in", correctAnswer: "9", points: 1, domain: "Algebra", createdAt: ago(2) },
    // Câu của lớp khác.
    { id: "pqx", assignmentId: "pax", orderIndex: 0, prompt: "Câu lớp khác", type: "grid_in", correctAnswer: "7", explanation: "Bí mật lớp khác", points: 1, domain: "Algebra", createdAt: ago(4) },
  ]);

  await db.insert(schema.submissions).values([
    { id: "psub1", assignmentId: "pa1", studentId: "ps1", status: "returned", finalGrade: 2, turnedInAt: ago(2), returnedAt: ago(1), createdAt: ago(2) },
    { id: "psub2", assignmentId: "pa1", studentId: "ps2", status: "returned", finalGrade: 4, turnedInAt: ago(2), returnedAt: ago(1), createdAt: ago(2) },
  ]);

  await db.insert(schema.answers).values([
    // An: sai pq1 và pq2 (Algebra), đúng pq4 (Geometry), pq5 chưa chấm.
    { id: "pan1", submissionId: "psub1", questionId: "pq1", response: "3", isCorrect: false, pointsAwarded: 0, answeredAt: ago(2) },
    { id: "pan2", submissionId: "psub1", questionId: "pq2", response: "5", isCorrect: false, pointsAwarded: 0, answeredAt: ago(2) },
    { id: "pan3", submissionId: "psub1", questionId: "pq4", response: "A", isCorrect: true, pointsAwarded: 1, answeredAt: ago(2) },
    { id: "pan4", submissionId: "psub1", questionId: "pq5", response: "Em nghĩ là...", isCorrect: null, pointsAwarded: null, answeredAt: ago(2) },
    // Bình đúng hết.
    { id: "pan5", submissionId: "psub2", questionId: "pq1", response: "2", isCorrect: true, pointsAwarded: 1, answeredAt: ago(2) },
    { id: "pan6", submissionId: "psub2", questionId: "pq2", response: "4", isCorrect: true, pointsAwarded: 1, answeredAt: ago(2) },
  ]);
});

describe("Mảng kiến thức đang yếu", () => {
  it("chỉ liệt kê mảng có câu sai, yếu nhất lên đầu", async () => {
    const rows = await weakDomains(an());
    // Geometry An làm đúng nên không xuất hiện.
    expect(rows.map((r) => r.domain)).toEqual(["Algebra"]);
    expect(rows[0]).toMatchObject({ answered: 2, correct: 0, wrong: 2, rate: 0 });
  });

  it("học sinh làm đúng hết thì không có mảng nào phải ôn", async () => {
    expect(await weakDomains(binh())).toEqual([]);
  });

  it("câu tự luận chưa chấm không bị tính là sai", async () => {
    const rows = await weakDomains(an());
    // pq5 là Algebra, is_correct NULL. Nếu bị tính, answered sẽ là 3.
    expect(rows[0].answered).toBe(2);
  });

  it("người chưa vào lớp nào thì danh sách rỗng, không lỗi", async () => {
    expect(await weakDomains(ctxFor("khong-ton-tai"))).toEqual([]);
  });
});

describe("Bộ câu ôn", () => {
  it("xếp câu từng làm sai lên trước câu chưa gặp", async () => {
    const set = await buildPracticeSet(an(), "Algebra");
    expect(set.slice(0, 2).map((q) => q.id).sort()).toEqual(["pq1", "pq2"]);
    expect(set.map((q) => q.id)).toContain("pq3");
    expect(set.find((q) => q.id === "pq1")?.wrongBefore).toBe(true);
    expect(set.find((q) => q.id === "pq3")?.seenBefore).toBe(false);
  });

  it("KHÔNG kèm đáp án hay lời giải trong payload", async () => {
    const set = await buildPracticeSet(an(), "Algebra");
    for (const q of set) {
      expect(q).not.toHaveProperty("correctAnswer");
      expect(q).not.toHaveProperty("explanation");
    }
    // Chốt bằng cả JSON: thêm cột mới mà quên loại bỏ thì chỗ này đỏ.
    expect(JSON.stringify(set)).not.toContain("Cộng hai số");
  });

  it("bỏ qua câu tự luận vì không tự chấm được", async () => {
    const set = await buildPracticeSet(an(), "Algebra");
    expect(set.map((q) => q.id)).not.toContain("pq5");
  });

  it("không lấy câu trong bài còn là bản nháp", async () => {
    const set = await buildPracticeSet(an(), "Algebra");
    expect(set.map((q) => q.id)).not.toContain("pq6");
  });

  it("không lấy câu của lớp khác, kể cả lớp mình làm trợ giảng", async () => {
    const set = await buildPracticeSet(an(), "Algebra");
    expect(set.map((q) => q.id)).not.toContain("pqx");
  });

  it("giới hạn số câu theo limit", async () => {
    expect(await buildPracticeSet(an(), "Algebra", 1)).toHaveLength(1);
  });
});

describe("Chấm câu luyện tập", () => {
  it("chấm đúng và trả kèm lời giải sau khi đã trả lời", async () => {
    const r = await gradePractice(an(), "pq1", "2");
    expect(r.correct).toBe(true);
    expect(r.correctAnswer).toBe("2");
    expect(r.explanation).toBe("Cộng hai số.");
  });

  it("trả lời sai thì báo sai", async () => {
    expect((await gradePractice(an(), "pq1", "3")).correct).toBe(false);
  });

  it("chuẩn hoá grid-in giống lúc chấm bài thật", async () => {
    // Engine chấp nhận cả phân số lẫn thập phân.
    expect((await gradePractice(an(), "pq2", " 4 ")).correct).toBe(true);
  });

  it("biết id câu của lớp khác cũng không lấy được đáp án", async () => {
    await expect(gradePractice(an(), "pqx", "7")).rejects.toThrow(ForbiddenError);
  });

  it("câu trong bài nháp cũng không chấm được", async () => {
    // pq6 thuộc lớp của An nhưng bài chưa publish.
    await expect(gradePractice(an(), "pq6", "9")).rejects.toThrow(ForbiddenError);
  });

  it("người ngoài lớp không chấm được câu của lớp này", async () => {
    await expect(gradePractice(nguoiNgoai(), "pq1", "2")).rejects.toThrow(ForbiddenError);
  });
});
