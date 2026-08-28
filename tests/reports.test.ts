import { beforeAll, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "@/db/schema";
import { ForbiddenError } from "@/lib/auth/policy";
import type { ClassContext } from "@/lib/auth/guard";
import { classReport } from "@/lib/repo/reports";
import { flagOf, overallScore, pct } from "@/lib/reports/types";
import { reportToCsv, reportFileName } from "@/lib/reports/csv";
import type { StudentReport } from "@/lib/reports/types";

/* ------------------------------------------------------------------ *
 * Báo cáo tiến độ.
 *
 * Con số ở đây đi thẳng tới phụ huynh, nên hai thứ phải chắc: mẫu số
 * đúng (bài chưa publish, bài chưa chấm, lượt thi chưa nộp đều không
 * được tính) và dữ liệu lớp khác không lẫn vào.
 * ------------------------------------------------------------------ */

const db = drizzle(env.DB, { schema });

const C1 = "rc1";
const C2 = "rc2";

const ctxFor = (userId: string, classId: string, classRole: "teacher" | "ta" | "student") =>
  ({
    user: { id: userId, role: classRole === "student" ? "student" : classRole },
    db,
    classId,
    classRole,
    klass: { id: classId, name: "Lớp Báo Cáo" },
  }) as unknown as ClassContext;

const teacher = () => ctxFor("rt1", C1, "teacher");
const ta = () => ctxFor("rta1", C1, "ta");
const student = () => ctxFor("rs1", C1, "student");
const otherTeacher = () => ctxFor("rt2", C2, "teacher");

const row = (rows: StudentReport[], id: string) => rows.find((r) => r.studentId === id)!;

beforeAll(async () => {
  const now = new Date();
  const t = (n: number) => new Date(now.getTime() - n * 86_400_000);

  await db.insert(schema.user).values([
    { id: "rt1", name: "GV A", email: "rt1@test.vn", role: "teacher", createdAt: now, updatedAt: now },
    { id: "rt2", name: "GV B", email: "rt2@test.vn", role: "teacher", createdAt: now, updatedAt: now },
    { id: "rta1", name: "TA A", email: "rta1@test.vn", role: "ta", createdAt: now, updatedAt: now },
    { id: "rs1", name: "An", email: "rs1@test.vn", role: "student", createdAt: now, updatedAt: now },
    { id: "rs2", name: "Bình", email: "rs2@test.vn", role: "student", createdAt: now, updatedAt: now },
    { id: "rout", name: "HS lớp khác", email: "rout@test.vn", role: "student", createdAt: now, updatedAt: now },
  ]);

  await db.insert(schema.classes).values([
    { id: C1, name: "Lớp Báo Cáo", code: "REP111", subject: "math", teacherId: "rt1", createdAt: now },
    { id: C2, name: "Lớp Khác", code: "REP222", subject: "rw", teacherId: "rt2", createdAt: now },
  ]);

  await db.insert(schema.classMembers).values([
    { id: "rcm1", classId: C1, userId: "rt1", role: "teacher", joinedAt: now },
    { id: "rcm2", classId: C1, userId: "rta1", role: "ta", joinedAt: now },
    { id: "rcm3", classId: C1, userId: "rs1", role: "student", joinedAt: now },
    { id: "rcm4", classId: C1, userId: "rs2", role: "student", joinedAt: now },
    { id: "rcm5", classId: C2, userId: "rt2", role: "teacher", joinedAt: now },
    { id: "rcm6", classId: C2, userId: "rout", role: "student", joinedAt: now },
  ]);

  await db.insert(schema.assignments).values([
    // Đã publish, thang 100 điểm.
    { id: "ra1", classId: C1, authorId: "rt1", title: "BT 1", points: 100, publishedAt: t(5), createdAt: t(6) },
    { id: "ra2", classId: C1, authorId: "rt1", title: "BT 2", points: 50, publishedAt: t(3), createdAt: t(4) },
    // Bản nháp — không được tính vào mẫu số của ai.
    { id: "ra3", classId: C1, authorId: "rt1", title: "Nháp", points: 100, createdAt: t(2) },
    // Bài của lớp khác.
    { id: "rax", classId: C2, authorId: "rt2", title: "BT lớp khác", points: 100, publishedAt: t(5), createdAt: t(6) },
  ]);

  await db.insert(schema.submissions).values([
    // An: BT1 đã trả 80/100, BT2 đã nộp nhưng CHƯA chấm xong.
    { id: "rsub1", assignmentId: "ra1", studentId: "rs1", status: "returned", finalGrade: 80, turnedInAt: t(4), returnedAt: t(3), createdAt: t(4) },
    { id: "rsub2", assignmentId: "ra2", studentId: "rs1", status: "turned_in", turnedInAt: t(1), isLate: true, createdAt: t(1) },
    // Bình: BT1 đã trả 45/100. BT2 chưa nộp gì.
    { id: "rsub3", assignmentId: "ra1", studentId: "rs2", status: "returned", finalGrade: 45, turnedInAt: t(4), returnedAt: t(3), createdAt: t(4) },
  ]);

  /* Thi: 1 đề, 1 module, 2 câu × 10 điểm = tối đa 20. */
  await db.insert(schema.exams).values({
    id: "rex1", classId: C1, title: "Giữa kỳ", kind: "midterm",
    openAt: t(2), closeAt: t(1), createdBy: "rt1", createdAt: t(3),
  });
  await db.insert(schema.examModules).values({
    id: "rem1", examId: "rex1", name: "Math M1", subject: "math",
    durationMinutes: 35, questionCount: 2, orderIndex: 0,
  });
  await db.insert(schema.questions).values([
    { id: "rq1", examModuleId: "rem1", prompt: "1+1?", type: "grid_in", correctAnswer: "2", points: 10, createdAt: t(3) },
    { id: "rq2", examModuleId: "rem1", prompt: "2+2?", type: "grid_in", correctAnswer: "4", points: 10, createdAt: t(3) },
  ]);
  /* Đề thứ hai: Bình làm xong nhưng lượt thi bị huỷ vì gian lận. */
  await db.insert(schema.exams).values({
    id: "rex2", classId: C1, title: "Thử", kind: "practice",
    openAt: t(2), closeAt: t(1), createdBy: "rt1", createdAt: t(3),
  });
  await db.insert(schema.examModules).values({
    id: "rem2", examId: "rex2", name: "Math M1", subject: "math",
    durationMinutes: 35, questionCount: 1, orderIndex: 0,
  });
  await db.insert(schema.questions).values({
    id: "rq3", examModuleId: "rem2", prompt: "3+3?", type: "grid_in", correctAnswer: "6", points: 10, createdAt: t(3),
  });

  await db.insert(schema.examAttempts).values([
    { id: "rat1", examId: "rex1", studentId: "rs1", status: "submitted", totalScore: 20, startedAt: t(2), submittedAt: t(2) },
    // Bình bỏ dở — chưa nộp thì không có điểm nào được tính.
    { id: "rat2", examId: "rex1", studentId: "rs2", status: "in_progress", startedAt: t(2) },
    // Lượt bị huỷ vẫn còn nguyên điểm trong DB; báo cáo phải bỏ qua.
    { id: "rat3", examId: "rex2", studentId: "rs2", status: "voided", totalScore: 10, startedAt: t(2), submittedAt: t(2) },
  ]);

  /* Chuyên cần: 4 buổi. An có mặt cả 4; Bình vắng 2, có phép 1. */
  await db.insert(schema.attendanceSessions).values([
    { id: "rss1", classId: C1, sessionDate: "2026-04-01", createdBy: "rt1", createdAt: t(4) },
    { id: "rss2", classId: C1, sessionDate: "2026-04-02", createdBy: "rt1", createdAt: t(3) },
    { id: "rss3", classId: C1, sessionDate: "2026-04-03", createdBy: "rt1", createdAt: t(2) },
    { id: "rss4", classId: C1, sessionDate: "2026-04-04", createdBy: "rt1", createdAt: t(1) },
  ]);
  await db.insert(schema.attendanceRecords).values([
    { id: "rar1", sessionId: "rss1", studentId: "rs1", status: "present", markedBy: "rt1", markedAt: t(4) },
    { id: "rar2", sessionId: "rss2", studentId: "rs1", status: "present", markedBy: "rt1", markedAt: t(3) },
    { id: "rar3", sessionId: "rss3", studentId: "rs1", status: "late", markedBy: "rt1", markedAt: t(2) },
    { id: "rar4", sessionId: "rss4", studentId: "rs1", status: "present", markedBy: "rt1", markedAt: t(1) },
    { id: "rar5", sessionId: "rss1", studentId: "rs2", status: "present", markedBy: "rt1", markedAt: t(4) },
    { id: "rar6", sessionId: "rss2", studentId: "rs2", status: "absent", markedBy: "rt1", markedAt: t(3) },
    { id: "rar7", sessionId: "rss3", studentId: "rs2", status: "absent", markedBy: "rt1", markedAt: t(2) },
    { id: "rar8", sessionId: "rss4", studentId: "rs2", status: "excused", markedBy: "rt1", markedAt: t(1) },
  ]);
});

describe("Quyền xem báo cáo", () => {
  it("giáo viên và TA xem được, học sinh thì không", async () => {
    await expect(classReport(teacher())).resolves.toHaveLength(2);
    await expect(classReport(ta())).resolves.toHaveLength(2);
    // Chốt cả nội dung: nếu guard riêng của báo cáo bị bỏ, lỗi sẽ đến từ
    // attendanceSummary ở cuối hàm — tức là roster và điểm đã kịp đọc xong.
    await expect(classReport(student())).rejects.toThrow(ForbiddenError);
    await expect(classReport(student())).rejects.toThrow(/Báo cáo dành cho/);
  });

  it("giáo viên lớp khác chỉ thấy học sinh lớp mình", async () => {
    const rows = await classReport(otherTeacher());
    expect(rows.map((r) => r.studentId)).toEqual(["rout"]);
  });

  it("chỉ liệt kê học sinh, không có giáo viên và TA", async () => {
    const rows = await classReport(teacher());
    expect(rows.map((r) => r.studentId).sort()).toEqual(["rs1", "rs2"]);
  });
});

describe("Điểm bài tập", () => {
  it("chỉ cộng bài đã TRẢ; bài nộp chưa chấm không vào tử số lẫn mẫu số", async () => {
    const an = row(await classReport(teacher()), "rs1");
    // BT2 (50đ) đã nộp nhưng chưa trả → không tính.
    expect(an.assignmentScore).toBe(80);
    expect(an.assignmentMax).toBe(100);
    expect(pct(an.assignmentScore, an.assignmentMax)).toBe(80);
    expect(an.assignmentsGraded).toBe(1);
  });

  it("bài nháp không tính vào số bài đã giao", async () => {
    const an = row(await classReport(teacher()), "rs1");
    // ra1 + ra2 đã publish, ra3 còn nháp.
    expect(an.assignmentsAssigned).toBe(2);
  });

  it("đếm được bài đã nộp và bài nộp trễ", async () => {
    const rows = await classReport(teacher());
    expect(row(rows, "rs1").assignmentsTurnedIn).toBe(2);
    expect(row(rows, "rs1").assignmentsLate).toBe(1);
    // Bình thiếu BT2 hẳn.
    expect(row(rows, "rs2").assignmentsTurnedIn).toBe(1);
    expect(row(rows, "rs2").assignmentsLate).toBe(0);
  });
});

describe("Điểm thi", () => {
  it("mẫu số là tổng điểm câu hỏi của đề", async () => {
    const an = row(await classReport(teacher()), "rs1");
    expect(an.examsTaken).toBe(1);
    expect(an.examScore).toBe(20);
    expect(an.examMax).toBe(20);
  });

  it("lượt đang làm dở và lượt bị huỷ đều không được tính", async () => {
    const binh = row(await classReport(teacher()), "rs2");
    // rat2 dở dang (chưa có điểm) và rat3 bị huỷ (CÓ điểm 10/10 trong DB).
    // Nếu chỉ lọc theo totalScore khác null thì lượt bị huỷ sẽ lọt vào đây.
    expect(binh.examsTaken).toBe(0);
    expect(binh.examScore).toBeNull();
    expect(pct(binh.examScore, binh.examMax)).toBeNull();
  });
});

describe("Chuyên cần trong báo cáo", () => {
  it("khớp với cách tính của trang điểm danh — buổi có phép không vào mẫu số", async () => {
    const rows = await classReport(teacher());
    expect(row(rows, "rs1").attendanceRate).toBe(100);
    // Bình: 1 có mặt / 3 buổi tính điểm (1 buổi có phép bị loại) = 33%.
    expect(row(rows, "rs2").attendanceRate).toBe(33);
  });
});

describe("Tổng kết và cảnh báo", () => {
  const base: StudentReport = {
    studentId: "x", name: "X", email: "x@test.vn",
    assignmentsGraded: 0, assignmentsAssigned: 0, assignmentsTurnedIn: 0, assignmentsLate: 0,
    assignmentScore: null, assignmentMax: null,
    examsTaken: 0, examScore: null, examMax: null,
    attendanceRate: null, sessionsCounted: 0,
  };

  it("chưa có dữ liệu nào thì trả null, không phải 0", () => {
    expect(overallScore(base)).toBeNull();
    expect(flagOf(base)).toBe("ok");
  });

  it("thiếu một phần thì chia lại trọng số cho phần còn lại", () => {
    // Chỉ có bài tập 80% → tổng kết đúng bằng 80, không bị kéo xuống 32.
    const r = { ...base, assignmentScore: 80, assignmentMax: 100 };
    expect(overallScore(r)).toBe(80);
  });

  it("gộp đủ ba phần theo trọng số 40/40/20", () => {
    const r = {
      ...base,
      assignmentScore: 80, assignmentMax: 100,
      examScore: 60, examMax: 100,
      attendanceRate: 100,
    };
    // 80*0.4 + 60*0.4 + 100*0.2 = 76
    expect(overallScore(r)).toBe(76);
  });

  it("chuyên cần thấp là cờ đỏ dù điểm vẫn đẹp", () => {
    const r = { ...base, assignmentScore: 95, assignmentMax: 100, attendanceRate: 60 };
    expect(flagOf(r)).toBe("risk");
  });

  it("thiếu từ 3 bài trở lên là cờ đỏ", () => {
    expect(flagOf({ ...base, assignmentsAssigned: 5, assignmentsTurnedIn: 2 })).toBe("risk");
    expect(flagOf({ ...base, assignmentsAssigned: 5, assignmentsTurnedIn: 4 })).toBe("watch");
  });
});

describe("Xuất CSV", () => {
  it("có BOM để Excel đọc đúng tiếng Việt", async () => {
    const csv = reportToCsv(await classReport(teacher()));
    expect(csv.startsWith("﻿")).toBe(true);
  });

  it("một dòng tiêu đề cộng một dòng mỗi học sinh", async () => {
    const rows = await classReport(teacher());
    const lines = reportToCsv(rows).trimEnd().split("\r\n");
    expect(lines).toHaveLength(rows.length + 1);
  });

  it("dấu phẩy trong tên được bọc nháy kép, không làm lệch cột", () => {
    const csv = reportToCsv([
      { ...({} as StudentReport), name: 'Nguyễn Văn A, "lớp 12"', email: "a@test.vn",
        assignmentsGraded: 0, assignmentsAssigned: 0, assignmentsTurnedIn: 0, assignmentsLate: 0,
        assignmentScore: null, assignmentMax: null, examsTaken: 0, examScore: null, examMax: null,
        attendanceRate: null, sessionsCounted: 0, studentId: "x" },
    ]);
    expect(csv).toContain('"Nguyễn Văn A, ""lớp 12"""');
  });

  it("tên file bỏ dấu và ký tự lạ", () => {
    expect(reportFileName("SAT Math — Sáng T7", "2026-08-28")).toBe(
      "bao-cao_SAT-Math-Sang-T7_2026-08-28.csv",
    );
  });
});
