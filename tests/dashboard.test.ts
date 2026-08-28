import { beforeAll, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "@/db/schema";
import type { AuthContext } from "@/lib/auth/guard";
import { vnDateKey } from "@/lib/utils/date";
import {
  classesNeedingAttendance,
  myAverage,
  recentGrades,
  studentStreak,
} from "@/lib/repo/dashboard";

/* ------------------------------------------------------------------ *
 * Số liệu trang chủ.
 *
 * Trước đây hai ô "Streak" và "XP" hiển thị hằng số 0 — nhìn thì có số,
 * nhưng không đọc dữ liệu nào. File này chốt rằng các con số mới thật sự
 * đổi theo dữ liệu, và chạy được trên SQLite thật chứ không chỉ hợp kiểu.
 * ------------------------------------------------------------------ */

const db = drizzle(env.DB, { schema });

const C1 = "dc1";

const ctxFor = (userId: string, role: "teacher" | "ta" | "student" | "admin") =>
  ({ user: { id: userId, role }, db }) as unknown as AuthContext;

const an = () => ctxFor("ds1", "student");
const binh = () => ctxFor("ds2", "student");
const teacher = () => ctxFor("dt1", "teacher");

/** Ngày giờ VN, lùi n ngày, chốt 10:00 để không rơi sang ngày khác khi đổi múi giờ. */
const dayAgo = (n: number) => {
  const d = new Date();
  d.setUTCHours(3, 0, 0, 0); // 10:00 giờ VN
  return new Date(d.getTime() - n * 86_400_000);
};

beforeAll(async () => {
  const now = new Date();

  await db.insert(schema.user).values([
    { id: "dt1", name: "GV D", email: "dt1@test.vn", role: "teacher", createdAt: now, updatedAt: now },
    { id: "ds1", name: "An", email: "ds1@test.vn", role: "student", createdAt: now, updatedAt: now },
    { id: "ds2", name: "Bình", email: "ds2@test.vn", role: "student", createdAt: now, updatedAt: now },
  ]);

  await db.insert(schema.classes).values([
    { id: C1, name: "Lớp Dash", code: "DSH111", subject: "math", teacherId: "dt1", createdAt: now },
    { id: "dc2", name: "Lớp Dash 2", code: "DSH222", subject: "rw", teacherId: "dt1", createdAt: now },
  ]);

  await db.insert(schema.classMembers).values([
    { id: "dcm1", classId: C1, userId: "dt1", role: "teacher", joinedAt: now },
    { id: "dcm2", classId: C1, userId: "ds1", role: "student", joinedAt: now },
    { id: "dcm3", classId: C1, userId: "ds2", role: "student", joinedAt: now },
    { id: "dcm4", classId: "dc2", userId: "dt1", role: "teacher", joinedAt: now },
  ]);

  await db.insert(schema.assignments).values([
    { id: "da1", classId: C1, authorId: "dt1", title: "BT 1", points: 100, publishedAt: dayAgo(6), createdAt: dayAgo(7) },
    { id: "da2", classId: C1, authorId: "dt1", title: "BT 2", points: 20, publishedAt: dayAgo(5), createdAt: dayAgo(6) },
  ]);

  await db.insert(schema.submissions).values([
    // An nộp 3 ngày liên tiếp: hôm nay, hôm qua, hôm kia.
    { id: "dsub1", assignmentId: "da1", studentId: "ds1", status: "returned", finalGrade: 90, turnedInAt: dayAgo(0), returnedAt: dayAgo(0), createdAt: dayAgo(0) },
    { id: "dsub2", assignmentId: "da2", studentId: "ds1", status: "returned", finalGrade: 15, turnedInAt: dayAgo(1), returnedAt: dayAgo(1), createdAt: dayAgo(1) },
    // Bình chỉ nộp một lần, cách đây 5 ngày → chuỗi đã đứt.
    { id: "dsub3", assignmentId: "da1", studentId: "ds2", status: "turned_in", turnedInAt: dayAgo(5), createdAt: dayAgo(5) },
    // Bình: bài ĐÃ CHẤM nhưng giáo viên chưa bấm Trả. Có điểm trong DB mà
    // học sinh chưa được phép thấy — chốt rằng lọc theo status, không phải
    // theo "có điểm hay chưa".
    { id: "dsub4", assignmentId: "da2", studentId: "ds2", status: "turned_in", finalGrade: 20, turnedInAt: dayAgo(5), createdAt: dayAgo(5) },
  ]);

  // Lượt thi tính vào chuỗi ngày học như nộp bài.
  await db.insert(schema.exams).values({
    id: "dex1", classId: C1, title: "Thi thử", kind: "practice",
    openAt: dayAgo(3), closeAt: dayAgo(2), createdBy: "dt1", createdAt: dayAgo(4),
  });
  await db.insert(schema.examAttempts).values({
    id: "dat1", examId: "dex1", studentId: "ds1", status: "submitted",
    totalScore: 10, startedAt: dayAgo(2), submittedAt: dayAgo(2),
  });

  // Lớp C1 đã điểm danh hôm nay. Lớp dc2 có điểm danh hôm kia nhưng chưa
  // có buổi nào hôm nay — nếu quên lọc theo ngày thì dc2 sẽ biến mất khỏi
  // danh sách việc cần làm.
  await db.insert(schema.attendanceSessions).values([
    { id: "dss1", classId: C1, sessionDate: vnDateKey(), createdBy: "dt1", createdAt: now },
    { id: "dss2", classId: "dc2", sessionDate: vnDateKey(dayAgo(2)), createdBy: "dt1", createdAt: dayAgo(2) },
  ]);
});

describe("Chuỗi ngày học", () => {
  it("đếm ngày liên tiếp có nộp bài hoặc nộp bài thi", async () => {
    // An: hôm nay, hôm qua, và hôm kia (qua lượt thi) → 3.
    expect(await studentStreak(an())).toBe(3);
  });

  it("bỏ trọn một ngày thì chuỗi đứt", async () => {
    // Bình chỉ hoạt động cách đây 5 ngày.
    expect(await studentStreak(binh())).toBe(0);
  });

  it("học sinh chưa làm gì thì là 0, không phải lỗi", async () => {
    expect(await studentStreak(ctxFor("khong-ton-tai", "student"))).toBe(0);
  });
});

describe("Điểm trung bình", () => {
  it("tính trên tổng điểm của các bài đã trả, không phải trung bình cộng của tỉ lệ", async () => {
    // An: (90 + 15) / (100 + 20) = 87.5% → 88.
    expect(await myAverage(an())).toBe(88);
  });

  it("chưa có bài nào được trả thì trả null, không phải 0", async () => {
    expect(await myAverage(binh())).toBeNull();
  });
});

describe("Điểm mới trả", () => {
  it("xếp bài trả gần nhất lên đầu và kèm tên lớp", async () => {
    const rows = await recentGrades(an());
    expect(rows.map((r) => r.assignmentId)).toEqual(["da1", "da2"]);
    expect(rows[0].className).toBe("Lớp Dash");
    expect(rows[0].grade).toBe(90);
    expect(rows[0].points).toBe(100);
  });

  it("bài đã chấm nhưng chưa TRẢ thì không lọt vào", async () => {
    // dsub4 có finalGrade 20 trong DB, nhưng status vẫn turned_in.
    expect(await recentGrades(binh())).toHaveLength(0);
  });

  it("điểm trung bình cũng không tính bài chưa trả", async () => {
    expect(await myAverage(binh())).toBeNull();
  });
});

describe("Lớp chưa điểm danh hôm nay", () => {
  it("chỉ liệt kê lớp chưa có buổi nào của ngày hôm nay", async () => {
    const rows = await classesNeedingAttendance(teacher());
    expect(rows.map((r) => r.id)).toEqual(["dc2"]);
  });

  it("học sinh không phụ trách lớp nào nên danh sách rỗng", async () => {
    expect(await classesNeedingAttendance(an())).toEqual([]);
  });
});
