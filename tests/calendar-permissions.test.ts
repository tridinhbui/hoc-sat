import { beforeAll, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "@/db/schema";
import { ForbiddenError } from "@/lib/auth/policy";
import type { AuthContext, ClassContext } from "@/lib/auth/guard";
import { createAssignment } from "@/lib/repo/assignments";
import {
  createEvent,
  deleteEvent,
  getCalendarFeed,
  listClassesIManage,
  listMyClassOptions,
} from "@/lib/repo/calendar";

/* ------------------------------------------------------------------ *
 * Calendar.
 *
 * Feed hợp nhất nên dễ rò rỉ nhất: một bài NHÁP hay lịch của lớp khác
 * lọt vào lịch là lộ ra ngoài mà không ai để ý, vì không ai nghĩ lịch là
 * chỗ có thể rò dữ liệu.
 * ------------------------------------------------------------------ */

const db = drizzle(env.DB, { schema });
const C1 = "cal1";
const C2 = "cal2";

const authFor = (userId: string, role: "teacher" | "ta" | "student" | "admin") =>
  ({ user: { id: userId, role }, db }) as unknown as AuthContext;

const classCtx = (userId: string, classRole: "teacher" | "ta" | "student", classId = C1) =>
  ({
    user: { id: userId, role: classRole === "student" ? "student" : classRole },
    db,
    classId,
    classRole,
    klass: { id: classId },
  }) as unknown as ClassContext;

const RANGE = {
  from: new Date("2026-09-01T00:00:00+07:00"),
  to: new Date("2026-09-30T23:59:59+07:00"),
};

beforeAll(async () => {
  const now = new Date();
  await db.insert(schema.user).values([
    { id: "cgv", name: "GV", email: "cgv@t.vn", role: "teacher", createdAt: now, updatedAt: now },
    { id: "cta", name: "TA", email: "cta@t.vn", role: "ta", createdAt: now, updatedAt: now },
    { id: "chs", name: "HS", email: "chs@t.vn", role: "student", createdAt: now, updatedAt: now },
    { id: "cout", name: "Ngoài", email: "cout@t.vn", role: "student", createdAt: now, updatedAt: now },
  ]);
  await db.insert(schema.classes).values([
    { id: C1, name: "Lớp lịch", code: "CAL111", subject: "rw", teacherId: "cgv", createdAt: now },
    { id: C2, name: "Lớp khác", code: "CAL222", subject: "math", teacherId: "cgv", createdAt: now },
  ]);
  await db.insert(schema.classMembers).values([
    { id: "ccm1", classId: C1, userId: "cgv", role: "teacher", joinedAt: now },
    { id: "ccm2", classId: C1, userId: "cta", role: "ta", joinedAt: now },
    { id: "ccm3", classId: C1, userId: "chs", role: "student", joinedAt: now },
    { id: "ccm4", classId: C2, userId: "cout", role: "student", joinedAt: now },
  ]);
});

describe("Ai được đặt lịch", () => {
  it("giáo viên tạo được, TA và học sinh thì không", async () => {
    const base = {
      title: "Buổi bù",
      type: "class" as const,
      startAt: new Date("2026-09-10T19:30:00+07:00"),
      allDay: false,
    };
    await expect(createEvent(classCtx("cgv", "teacher"), base)).resolves.toBeTruthy();
    await expect(createEvent(classCtx("cta", "ta"), base)).rejects.toThrow(ForbiddenError);
    await expect(createEvent(classCtx("chs", "student"), base)).rejects.toThrow(ForbiddenError);
  });

  it("TA không xoá được mục trên lịch", async () => {
    const id = await createEvent(classCtx("cgv", "teacher"), {
      title: "Nghỉ lễ",
      type: "other",
      startAt: new Date("2026-09-02T00:00:00+07:00"),
      allDay: true,
    });
    await expect(deleteEvent(classCtx("cta", "ta"), id)).rejects.toThrow(ForbiddenError);
    await expect(deleteEvent(classCtx("cgv", "teacher"), id)).resolves.toBeUndefined();
  });

  it("không xoá được mục của lớp khác", async () => {
    const id = await createEvent(classCtx("cgv", "teacher"), {
      title: "Của lớp 1",
      type: "class",
      startAt: new Date("2026-09-11T19:30:00+07:00"),
      allDay: false,
    });
    await expect(
      deleteEvent(classCtx("cgv", "teacher", C2), id),
    ).rejects.toThrow(ForbiddenError);
  });

  it("chỉ giáo viên nằm trong danh sách được sửa lịch", async () => {
    expect([...(await listClassesIManage(authFor("cgv", "teacher")))]).toContain(C1);
    expect((await listClassesIManage(authFor("cta", "ta"))).size).toBe(0);
    expect((await listClassesIManage(authFor("chs", "student"))).size).toBe(0);
  });
});

describe("Feed hợp nhất", () => {
  it("hạn nộp bài tự lên lịch, không phải nhập tay", async () => {
    const aid = await createAssignment(classCtx("cgv", "teacher"), {
      title: "Bài tuần 3",
      dueAt: new Date("2026-09-15T21:30:00+07:00"),
      points: 10,
      allowLate: true,
      publish: true,
      files: [],
    });

    const feed = await getCalendarFeed(authFor("chs", "student"), RANGE);
    const due = feed.find((f) => f.id === `assignment:${aid}`);

    expect(due).toBeTruthy();
    expect(due).toMatchObject({ source: "assignment", type: "deadline", dateKey: "2026-09-15" });
    // Link phải trỏ đúng nhánh của người xem.
    expect(due?.href).toBe(`/student/classes/${C1}/assignments/${aid}`);
  });

  it("link trỏ đúng nhánh theo vai trò trong lớp", async () => {
    const aid = await createAssignment(classCtx("cgv", "teacher"), {
      title: "Bài kiểm link",
      dueAt: new Date("2026-09-16T21:30:00+07:00"),
      points: 10,
      allowLate: true,
      publish: true,
      files: [],
    });

    const forTa = await getCalendarFeed(authFor("cta", "ta"), RANGE);
    const forTeacher = await getCalendarFeed(authFor("cgv", "teacher"), RANGE);

    expect(forTa.find((f) => f.id === `assignment:${aid}`)?.href).toBe(
      `/ta/classes/${C1}/assignments/${aid}`,
    );
    expect(forTeacher.find((f) => f.id === `assignment:${aid}`)?.href).toBe(
      `/teacher/classes/${C1}/assignments/${aid}`,
    );
  });

  it("BÀI NHÁP không lọt vào lịch của học sinh", async () => {
    const aid = await createAssignment(classCtx("cgv", "teacher"), {
      title: "Bài còn nháp",
      dueAt: new Date("2026-09-20T21:30:00+07:00"),
      points: 10,
      allowLate: true,
      publish: false,
      files: [],
    });

    const forStudent = await getCalendarFeed(authFor("chs", "student"), RANGE);
    const forTeacher = await getCalendarFeed(authFor("cgv", "teacher"), RANGE);

    expect(forStudent.find((f) => f.id === `assignment:${aid}`)).toBeUndefined();
    // Giáo viên vẫn thấy, và được đánh dấu rõ là nháp.
    expect(forTeacher.find((f) => f.id === `assignment:${aid}`)?.title).toMatch(/nháp/);
  });

  it("không thấy lịch của lớp mình không tham gia", async () => {
    await createEvent(classCtx("cgv", "teacher"), {
      title: "Riêng lớp 1",
      type: "class",
      startAt: new Date("2026-09-25T19:30:00+07:00"),
      allDay: false,
    });

    const outsider = await getCalendarFeed(authFor("cout", "student"), RANGE);
    expect(outsider.every((f) => f.classId !== C1)).toBe(true);
  });

  it("lọc theo lớp không thuộc về mình thì trả rỗng, không lộ gì", async () => {
    const feed = await getCalendarFeed(authFor("cout", "student"), { ...RANGE, classId: C1 });
    expect(feed).toEqual([]);
  });

  it("danh sách lớp để lọc chỉ gồm lớp của mình", async () => {
    const opts = await listMyClassOptions(authFor("chs", "student"));
    expect(opts.map((o) => o.id)).toEqual([C1]);
  });
});
