import { beforeAll, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "@/db/schema";
import {
  ANY_MEMBER,
  STAFF,
  TEACHER_ONLY,
  assertClassAccess,
  assertOwnSubmission,
  ForbiddenError,
  type Actor,
} from "@/lib/auth/policy";

/* ------------------------------------------------------------------ *
 * Ma trận phân quyền — PLAN.md §4.
 *
 * D1 không có RLS, nên đây là lưới an toàn duy nhất còn lại. Mỗi guard
 * phải được thử với CẢ 4 role hệ thống + người ngoài lớp.
 * ------------------------------------------------------------------ */

const db = drizzle(env.DB, { schema });

const ACTORS = {
  admin: { id: "u-admin", role: "admin" },
  teacher: { id: "u-teacher", role: "teacher" },
  ta: { id: "u-ta", role: "ta" },
  student: { id: "u-student", role: "student" },
  /** Học sinh có thật nhưng KHÔNG thuộc lớp C1 */
  outsider: { id: "u-outsider", role: "student" },
  /** Giáo viên của lớp khác — không được xem lớp C1 */
  otherTeacher: { id: "u-other-teacher", role: "teacher" },
} satisfies Record<string, Actor>;

const C1 = "class-1";
const GHOST = "class-khong-ton-tai";

beforeAll(async () => {
  const now = new Date();

  await db.insert(schema.user).values(
    Object.entries(ACTORS).map(([key, a]) => ({
      id: a.id,
      name: key,
      email: `${key}@test.vn`,
      role: a.role,
      createdAt: now,
      updatedAt: now,
    })),
  );

  await db.insert(schema.classes).values({
    id: C1,
    name: "SAT RW — lớp test",
    code: "TEST01",
    subject: "rw",
    teacherId: ACTORS.teacher.id,
    createdAt: now,
  });

  await db.insert(schema.classMembers).values([
    { id: "m1", classId: C1, userId: ACTORS.teacher.id, role: "teacher", joinedAt: now },
    { id: "m2", classId: C1, userId: ACTORS.ta.id, role: "ta", joinedAt: now },
    { id: "m3", classId: C1, userId: ACTORS.student.id, role: "student", joinedAt: now },
  ]);

  await db.insert(schema.assignments).values({
    id: "a1",
    classId: C1,
    authorId: ACTORS.teacher.id,
    title: "Bài test",
    kind: "file",
    points: 100,
    allowLate: true,
    createdAt: now,
  });

  await db.insert(schema.submissions).values({
    id: "sub-student",
    assignmentId: "a1",
    studentId: ACTORS.student.id,
    status: "turned_in",
    isLate: false,
    createdAt: now,
  });
});

const allow = (actor: Actor, allowed: readonly ("teacher" | "ta" | "student")[]) =>
  assertClassAccess(db, actor, C1, allowed);

describe("assertClassAccess — ai vào được lớp", () => {
  it("giáo viên của lớp: qua mọi guard", async () => {
    await expect(allow(ACTORS.teacher, TEACHER_ONLY)).resolves.toMatchObject({
      classRole: "teacher",
    });
    await expect(allow(ACTORS.teacher, STAFF)).resolves.toBeTruthy();
    await expect(allow(ACTORS.teacher, ANY_MEMBER)).resolves.toBeTruthy();
  });

  it("admin đi xuyên mọi lớp với quyền giáo viên", async () => {
    await expect(allow(ACTORS.admin, TEACHER_ONLY)).resolves.toMatchObject({
      classRole: "teacher",
    });
  });

  it("TA: vào được STAFF, BỊ CHẶN ở teacher-only (roster, cài đặt lớp, lịch, đề thi)", async () => {
    await expect(allow(ACTORS.ta, STAFF)).resolves.toMatchObject({ classRole: "ta" });
    await expect(allow(ACTORS.ta, ANY_MEMBER)).resolves.toBeTruthy();
    await expect(allow(ACTORS.ta, TEACHER_ONLY)).rejects.toThrow(ForbiddenError);
  });

  it("học sinh: chỉ vào được ANY_MEMBER", async () => {
    await expect(allow(ACTORS.student, ANY_MEMBER)).resolves.toMatchObject({
      classRole: "student",
    });
    await expect(allow(ACTORS.student, STAFF)).rejects.toThrow(ForbiddenError);
    await expect(allow(ACTORS.student, TEACHER_ONLY)).rejects.toThrow(ForbiddenError);
  });

  it("người ngoài lớp bị chặn ở MỌI guard, kể cả khi là giáo viên lớp khác", async () => {
    for (const guard of [TEACHER_ONLY, STAFF, ANY_MEMBER]) {
      await expect(allow(ACTORS.outsider, guard)).rejects.toThrow(ForbiddenError);
      await expect(allow(ACTORS.otherTeacher, guard)).rejects.toThrow(ForbiddenError);
    }
  });

  it("không lộ sự tồn tại của lớp: lớp không có thật và lớp không được vào báo GIỐNG nhau", async () => {
    const message = async (p: Promise<unknown>) => {
      try {
        await p;
        throw new Error("đáng lẽ phải bị chặn");
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenError);
        return (e as ForbiddenError).message;
      }
    };

    const notMember = await message(allow(ACTORS.outsider, ANY_MEMBER));
    const ghost = await message(assertClassAccess(db, ACTORS.outsider, GHOST, ANY_MEMBER));
    expect(notMember).toBe(ghost);
  });
});

describe("assertOwnSubmission — học sinh chỉ chạm bài của mình", () => {
  it("chủ bài nộp: qua", async () => {
    await expect(assertOwnSubmission(db, ACTORS.student.id, "sub-student")).resolves.toMatchObject({
      id: "sub-student",
    });
  });

  it("học sinh khác: bị chặn", async () => {
    await expect(assertOwnSubmission(db, ACTORS.outsider.id, "sub-student")).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("bài nộp không tồn tại: bị chặn", async () => {
    await expect(assertOwnSubmission(db, ACTORS.student.id, "khong-co")).rejects.toThrow(
      ForbiddenError,
    );
  });
});
