import { beforeAll, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { and, eq } from "drizzle-orm";

import * as schema from "@/db/schema";
import { ForbiddenError } from "@/lib/auth/policy";
import type { AuthContext, ClassContext } from "@/lib/auth/guard";
import { vnDateKey } from "@/lib/utils/date";
import {
  attendanceSummary,
  deleteSession,
  getSessionSheet,
  listSessions,
  markSession,
  markedTodayByClass,
  myAttendance,
  openSession,
} from "@/lib/repo/attendance";

/* ------------------------------------------------------------------ *
 * Luật điểm danh — PLAN.md §4.
 *
 * Giáo viên và TA điểm danh được; học sinh chỉ xem của mình. Xoá buổi là
 * việc riêng của giáo viên. Ngoài ma trận quyền, file này còn chốt hai
 * chỗ dữ liệu dễ rò theo id: buổi của lớp khác và học sinh của lớp khác.
 * ------------------------------------------------------------------ */

const db = drizzle(env.DB, { schema });

const C1 = "ac1";
const C2 = "ac2";

const ctxFor = (userId: string, classId: string, classRole: "teacher" | "ta" | "student") =>
  ({
    user: { id: userId, role: classRole === "student" ? "student" : classRole },
    db,
    classId,
    classRole,
    klass: { id: classId },
  }) as unknown as ClassContext;

const teacher = () => ctxFor("at1", C1, "teacher");
const ta = () => ctxFor("ata1", C1, "ta");
const student = () => ctxFor("as1", C1, "student");
/** Giáo viên lớp khác — có quyền điểm danh, nhưng ở lớp C2. */
const otherTeacher = () => ctxFor("at2", C2, "teacher");

const TODAY = "2026-03-02";

beforeAll(async () => {
  const now = new Date();

  await db.insert(schema.user).values([
    { id: "at1", name: "GV A", email: "at1@test.vn", role: "teacher", createdAt: now, updatedAt: now },
    { id: "at2", name: "GV B", email: "at2@test.vn", role: "teacher", createdAt: now, updatedAt: now },
    { id: "ata1", name: "TA A", email: "ata1@test.vn", role: "ta", createdAt: now, updatedAt: now },
    { id: "as1", name: "HS A", email: "as1@test.vn", role: "student", createdAt: now, updatedAt: now },
    { id: "as2", name: "HS B", email: "as2@test.vn", role: "student", createdAt: now, updatedAt: now },
    { id: "aout", name: "HS lớp khác", email: "aout@test.vn", role: "student", createdAt: now, updatedAt: now },
  ]);

  await db.insert(schema.classes).values([
    { id: C1, name: "Lớp A", code: "ATT111", subject: "rw", teacherId: "at1", createdAt: now },
    { id: C2, name: "Lớp B", code: "ATT222", subject: "math", teacherId: "at2", createdAt: now },
  ]);

  await db.insert(schema.classMembers).values([
    { id: "acm1", classId: C1, userId: "at1", role: "teacher", joinedAt: now },
    { id: "acm2", classId: C1, userId: "ata1", role: "ta", joinedAt: now },
    { id: "acm3", classId: C1, userId: "as1", role: "student", joinedAt: now },
    { id: "acm4", classId: C1, userId: "as2", role: "student", joinedAt: now },
    { id: "acm5", classId: C2, userId: "at2", role: "teacher", joinedAt: now },
    { id: "acm6", classId: C2, userId: "aout", role: "student", joinedAt: now },
  ]);
});

describe("Mở buổi điểm danh", () => {
  it("giáo viên và TA mở được, học sinh thì không", async () => {
    await expect(openSession(teacher(), TODAY)).resolves.toBeTruthy();
    await expect(openSession(ta(), "2026-03-03")).resolves.toBeTruthy();
    await expect(openSession(student(), "2026-03-04")).rejects.toThrow(ForbiddenError);
  });

  it("mở lại cùng một ngày thì dùng lại buổi cũ, không tạo trùng", async () => {
    const a = await openSession(teacher(), "2026-03-10");
    const b = await openSession(ta(), "2026-03-10");
    expect(b.id).toBe(a.id);
  });

  it("ngày sai định dạng bị chặn", async () => {
    await expect(openSession(teacher(), "02/03/2026")).rejects.toThrow(/Ngày không hợp lệ/);
  });
});

describe("Danh sách điểm danh của một buổi", () => {
  it("học sinh không mở được bảng điểm danh cả lớp", async () => {
    const s = await openSession(teacher(), "2026-03-05");
    await expect(getSessionSheet(student(), s.id)).rejects.toThrow(ForbiddenError);
  });

  it("giáo viên lớp khác không đọc được buổi của lớp này", async () => {
    const s = await openSession(teacher(), "2026-03-06");
    // Đúng role, đúng luật hệ thống — chỉ sai lớp. Nếu repo quên lọc theo
    // classId thì chỗ này lộ toàn bộ roster lớp khác.
    await expect(getSessionSheet(otherTeacher(), s.id)).rejects.toThrow(ForbiddenError);
  });

  it("roster chỉ gồm học sinh, không có giáo viên và TA", async () => {
    const s = await openSession(teacher(), "2026-03-07");
    const { roster } = await getSessionSheet(teacher(), s.id);
    expect(roster.map((r) => r.studentId).sort()).toEqual(["as1", "as2"]);
  });
});

describe("Ghi điểm danh", () => {
  it("TA ghi được, học sinh thì không", async () => {
    const s = await openSession(teacher(), "2026-03-11");
    await expect(
      markSession(ta(), s.id, [{ studentId: "as1", status: "present" }]),
    ).resolves.toBe(1);
    await expect(
      markSession(student(), s.id, [{ studentId: "as1", status: "present" }]),
    ).rejects.toThrow(ForbiddenError);
  });

  it("không ghi được cho học sinh lớp khác dù sửa id trong form", async () => {
    const s = await openSession(teacher(), "2026-03-12");
    const n = await markSession(teacher(), s.id, [
      { studentId: "as1", status: "present" },
      { studentId: "aout", status: "absent" },
    ]);
    expect(n).toBe(1);

    const leaked = await db.query.attendanceRecords.findFirst({
      where: and(
        eq(schema.attendanceRecords.sessionId, s.id),
        eq(schema.attendanceRecords.studentId, "aout"),
      ),
    });
    expect(leaked).toBeUndefined();
  });

  it("không ghi được vào buổi của lớp khác", async () => {
    const s = await openSession(otherTeacher(), "2026-03-13");
    await expect(
      markSession(teacher(), s.id, [{ studentId: "as1", status: "present" }]),
    ).rejects.toThrow(ForbiddenError);
  });

  it("ghi lại buổi cũ thì ghi đè, đây là đường sửa lịch sử", async () => {
    const s = await openSession(teacher(), "2026-03-14");
    await markSession(teacher(), s.id, [{ studentId: "as1", status: "absent" }]);
    await markSession(teacher(), s.id, [{ studentId: "as1", status: "present", note: "đến muộn 5'" }]);

    const rows = await db.query.attendanceRecords.findMany({
      where: and(
        eq(schema.attendanceRecords.sessionId, s.id),
        eq(schema.attendanceRecords.studentId, "as1"),
      ),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("present");
  });

  it("trạng thái lạ bị loại, không ghi vào DB", async () => {
    const s = await openSession(teacher(), "2026-03-15");
    const n = await markSession(teacher(), s.id, [
      // @ts-expect-error — mô phỏng form bị sửa tay
      { studentId: "as1", status: "hacked" },
    ]);
    expect(n).toBe(0);
  });
});

describe("Xoá buổi", () => {
  it("TA không xoá được, giáo viên thì được", async () => {
    const s = await openSession(teacher(), "2026-03-16");
    await expect(deleteSession(ta(), s.id)).rejects.toThrow(ForbiddenError);
    await expect(deleteSession(teacher(), s.id)).resolves.toBeUndefined();
  });

  it("giáo viên lớp khác không xoá được buổi của lớp này", async () => {
    const s = await openSession(teacher(), "2026-03-17");
    await expect(deleteSession(otherTeacher(), s.id)).rejects.toThrow(ForbiddenError);
  });
});

describe("Thống kê", () => {
  it("học sinh không xem được thống kê cả lớp", async () => {
    await expect(attendanceSummary(student())).rejects.toThrow(ForbiddenError);
  });

  it("giáo viên và TA xem được, và chỉ thấy học sinh lớp mình", async () => {
    const rows = await attendanceSummary(ta());
    expect(rows.map((r) => r.studentId).sort()).toEqual(["as1", "as2"]);
  });

  it("myAttendance chỉ trả bản ghi của chính học sinh đó", async () => {
    const s = await openSession(teacher(), "2026-03-18");
    await markSession(teacher(), s.id, [
      { studentId: "as1", status: "present" },
      { studentId: "as2", status: "absent" },
    ]);

    const mine = await myAttendance(student());
    expect(mine.rows.length).toBeGreaterThan(0);
    // Không có đường nào để lộ trạng thái của bạn cùng lớp.
    expect(mine.absent).toBe(0);
  });

  it("listSessions chỉ trả buổi của lớp đang mở", async () => {
    await openSession(otherTeacher(), "2026-03-19");
    const sessions = await listSessions(teacher());
    const dates = sessions.map((s) => s.sessionDate);
    expect(dates).not.toContain("2026-03-19");
  });
});

describe("Dashboard TA", () => {
  it("chỉ tính lớp mà người dùng dạy hoặc trợ giảng, và chỉ tính hôm nay", async () => {
    // Phải dùng đúng ngày hôm nay theo giờ VN: markedTodayByClass lọc theo
    // vnDateKey(), buổi ngày khác sẽ không vào kết quả và test hoá vô nghĩa.
    const today = vnDateKey();

    const inC2 = await openSession(otherTeacher(), today);
    await markSession(otherTeacher(), inC2.id, [{ studentId: "aout", status: "present" }]);

    const asTa = { user: { id: "ata1", role: "ta" }, db } as unknown as AuthContext;
    // C2 đã điểm danh hôm nay, nhưng ata1 không dạy lớp đó.
    expect(await markedTodayByClass(asTa)).not.toContain(C2);

    const inC1 = await openSession(teacher(), today);
    await markSession(teacher(), inC1.id, [{ studentId: "as1", status: "present" }]);
    // Lớp mình thì phải thấy — nếu không, khẳng định ở trên chỉ đúng vì rỗng.
    expect(await markedTodayByClass(asTa)).toContain(C1);
  });
});
