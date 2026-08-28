import { beforeAll, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "@/db/schema";
import { ForbiddenError } from "@/lib/auth/policy";
import type { ClassContext } from "@/lib/auth/guard";
import { createAnnouncement, deleteAnnouncement, togglePin } from "@/lib/repo/announcements";
import { createMaterial, resolveAttachmentForDownload } from "@/lib/repo/materials";
import { addMemberByEmail, listRoster, removeMember, updateClass } from "@/lib/repo/classes";

/* ------------------------------------------------------------------ *
 * Luật nội dung trong lớp — PLAN.md §4.
 *
 * Khác với tests/permissions.test.ts (kiểm cửa vào lớp), file này kiểm
 * những luật mịn hơn: TA đăng được nhưng không sửa được lớp, TA chỉ xoá
 * được bài của mình, file của lớp này không gắn được sang lớp khác.
 * ------------------------------------------------------------------ */

const db = drizzle(env.DB, { schema });

const C1 = "c1";
const C2 = "c2";

/** Context chỉ sinh được từ guard trong app; trong test thì dựng thẳng. */
const ctxFor = (userId: string, classId: string, classRole: "teacher" | "ta" | "student") =>
  ({
    user: { id: userId, role: classRole === "student" ? "student" : classRole },
    db,
    classId,
    classRole,
    klass: { id: classId },
  }) as unknown as ClassContext;

const teacher = () => ctxFor("t1", C1, "teacher");
const ta = () => ctxFor("ta1", C1, "ta");
const student = () => ctxFor("s1", C1, "student");

beforeAll(async () => {
  const now = new Date();

  await db.insert(schema.user).values([
    { id: "t1", name: "Giáo viên", email: "t1@test.vn", role: "teacher", createdAt: now, updatedAt: now },
    { id: "ta1", name: "Trợ giảng", email: "ta1@test.vn", role: "ta", createdAt: now, updatedAt: now },
    { id: "s1", name: "Học sinh", email: "s1@test.vn", role: "student", createdAt: now, updatedAt: now },
    { id: "out1", name: "Người ngoài", email: "out1@test.vn", role: "student", createdAt: now, updatedAt: now },
  ]);

  await db.insert(schema.classes).values([
    { id: C1, name: "Lớp 1", code: "AAA111", subject: "rw", teacherId: "t1", createdAt: now },
    { id: C2, name: "Lớp 2", code: "BBB222", subject: "math", teacherId: "t1", createdAt: now },
  ]);

  await db.insert(schema.classMembers).values([
    { id: "cm1", classId: C1, userId: "t1", role: "teacher", joinedAt: now },
    { id: "cm2", classId: C1, userId: "ta1", role: "ta", joinedAt: now },
    { id: "cm3", classId: C1, userId: "s1", role: "student", joinedAt: now },
    { id: "cm4", classId: C2, userId: "out1", role: "student", joinedAt: now },
  ]);

  // File thuộc lớp C1, dùng để thử tải chéo lớp.
  await db.insert(schema.attachments).values({
    id: "att-c1",
    ownerType: "material",
    ownerId: "m-c1",
    r2Key: `class/${C1}/material/abc/de.pdf`,
    fileName: "de.pdf",
    mime: "application/pdf",
    size: 100,
  });
});

describe("Thông báo", () => {
  it("giáo viên và TA đăng được, học sinh thì không", async () => {
    await expect(createAnnouncement(teacher(), "từ giáo viên")).resolves.toBeTruthy();
    await expect(createAnnouncement(ta(), "từ TA")).resolves.toBeTruthy();
    await expect(createAnnouncement(student(), "từ học sinh")).rejects.toThrow(ForbiddenError);
  });

  it("TA chỉ xoá được thông báo của chính mình", async () => {
    const byTeacher = await createAnnouncement(teacher(), "bài của giáo viên");
    const byTa = await createAnnouncement(ta(), "bài của TA");

    await expect(deleteAnnouncement(ta(), byTeacher)).rejects.toThrow(ForbiddenError);
    await expect(deleteAnnouncement(ta(), byTa)).resolves.toBeUndefined();
  });

  it("giáo viên xoá được thông báo của TA", async () => {
    const byTa = await createAnnouncement(ta(), "TA viết, giáo viên xoá");
    await expect(deleteAnnouncement(teacher(), byTa)).resolves.toBeUndefined();
  });

  it("ghim là quyền của giáo viên", async () => {
    const id = await createAnnouncement(teacher(), "cần ghim");
    await expect(togglePin(ta(), id, true)).rejects.toThrow(ForbiddenError);
    await expect(togglePin(teacher(), id, true)).resolves.toBeUndefined();
  });

  it("không xoá được thông báo của lớp khác", async () => {
    const id = await createAnnouncement(teacher(), "của lớp 1");
    const teacherOfC2 = ctxFor("t1", C2, "teacher");
    await expect(deleteAnnouncement(teacherOfC2, id)).rejects.toThrow(ForbiddenError);
  });
});

describe("Tài liệu", () => {
  it("không gắn được file của lớp khác vào tài liệu lớp mình", async () => {
    await expect(
      createMaterial(teacher(), {
        title: "Đề trộm từ lớp khác",
        files: [
          { r2Key: `class/${C2}/material/x/de.pdf`, fileName: "de.pdf", mime: null, size: 1 },
        ],
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("file đúng lớp thì gắn được", async () => {
    await expect(
      createMaterial(teacher(), {
        title: "Đề tuần 1",
        files: [
          { r2Key: `class/${C1}/material/y/de.pdf`, fileName: "de.pdf", mime: null, size: 1 },
        ],
      }),
    ).resolves.toBeTruthy();
  });

  it("học sinh không đăng được tài liệu", async () => {
    await expect(
      createMaterial(student(), { title: "học sinh đăng", files: [] }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("tải file: thành viên lớp được, người lớp khác bị chặn", async () => {
    const member = { user: { id: "s1", role: "student" }, db } as never;
    const outsider = { user: { id: "out1", role: "student" }, db } as never;

    await expect(resolveAttachmentForDownload(member, "att-c1")).resolves.toMatchObject({
      id: "att-c1",
    });
    await expect(resolveAttachmentForDownload(outsider, "att-c1")).rejects.toThrow(ForbiddenError);
  });
});

describe("Roster và cài đặt lớp — teacher-only", () => {
  it("TA không xem được danh sách lớp", async () => {
    await expect(listRoster(ta())).rejects.toThrow();
    await expect(listRoster(teacher())).resolves.toBeInstanceOf(Array);
  });

  it("TA không thêm/gỡ được thành viên", async () => {
    await expect(addMemberByEmail(ta(), "out1@test.vn", "student")).rejects.toThrow(ForbiddenError);
    await expect(removeMember(ta(), "cm3")).rejects.toThrow(ForbiddenError);
  });

  it("TA không sửa được cài đặt lớp", async () => {
    await expect(updateClass(ta(), { name: "TA đổi tên" })).rejects.toThrow(ForbiddenError);
  });

  it("không gỡ được giáo viên khỏi lớp", async () => {
    await expect(removeMember(teacher(), "cm1")).rejects.toThrow(ForbiddenError);
  });

  it("không gán vai trò TA cho tài khoản học sinh", async () => {
    const res = await addMemberByEmail(teacher(), "out1@test.vn", "ta");
    expect(res).toMatchObject({ ok: false, reason: "not_ta_account" });
  });
});
