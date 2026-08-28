import "server-only";
import { and, countDistinct, count, desc, eq, inArray } from "drizzle-orm";
import { classes, classMembers, user } from "@/db/schema";
import type { AuthContext, ClassContext } from "@/lib/auth/guard";
import { ForbiddenError } from "@/lib/auth/policy";
import { generateClassCode } from "@/lib/utils/class-code";

export type MyClass = {
  id: string;
  name: string;
  code: string;
  subject: "rw" | "math";
  classRole: "teacher" | "ta" | "student";
  archived: boolean;
};

/** Lớp mà user hiện tại là thành viên. Admin thấy toàn bộ. */
export async function listMyClasses(ctx: AuthContext): Promise<MyClass[]> {
  if (ctx.user.role === "admin") {
    const rows = await ctx.db.query.classes.findMany({ orderBy: [desc(classes.createdAt)] });
    return rows.map((c) => ({ ...c, classRole: "teacher" as const }));
  }

  const rows = await ctx.db
    .select({
      id: classes.id,
      name: classes.name,
      code: classes.code,
      subject: classes.subject,
      archived: classes.archived,
      classRole: classMembers.role,
    })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(eq(classMembers.userId, ctx.user.id))
    .orderBy(desc(classes.createdAt));

  return rows;
}

/** Giáo viên tạo lớp — subject chọn TRƯỚC, quyết định preset đề và UI. */
export async function createClass(
  ctx: AuthContext,
  input: { name: string; subject: "rw" | "math"; scheduleNote?: string },
) {
  if (ctx.user.role !== "teacher" && ctx.user.role !== "admin") {
    throw new Error("createClass cần role teacher hoặc admin");
  }

  // Mã lớp phải unique — thử lại vài lần trước khi chịu thua.
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = crypto.randomUUID();
    const code = generateClassCode();
    const existing = await ctx.db.query.classes.findFirst({ where: eq(classes.code, code) });
    if (existing) continue;

    await ctx.db.batch([
      ctx.db.insert(classes).values({
        id,
        name: input.name,
        code,
        subject: input.subject,
        teacherId: ctx.user.id,
        scheduleNote: input.scheduleNote,
      }),
      ctx.db.insert(classMembers).values({
        id: crypto.randomUUID(),
        classId: id,
        userId: ctx.user.id,
        role: "teacher",
      }),
    ]);
    return { id, code };
  }
  throw new Error("Không sinh được mã lớp. Thử lại giúp mình nhé.");
}

/** Học sinh join bằng mã lớp. */
export async function joinClassByCode(ctx: AuthContext, rawCode: string) {
  const code = rawCode.trim().toUpperCase();
  const klass = await ctx.db.query.classes.findFirst({ where: eq(classes.code, code) });
  if (!klass || klass.archived) return { ok: false as const, reason: "not_found" as const };

  const existing = await ctx.db.query.classMembers.findFirst({
    where: and(eq(classMembers.classId, klass.id), eq(classMembers.userId, ctx.user.id)),
  });
  if (existing) return { ok: true as const, classId: klass.id, already: true };

  await ctx.db.insert(classMembers).values({
    id: crypto.randomUUID(),
    classId: klass.id,
    userId: ctx.user.id,
    role: "student",
  });
  return { ok: true as const, classId: klass.id, already: false };
}

/** Danh sách thành viên — chỉ giáo viên (roster là teacher-only, TA không thấy). */
export async function listRoster(ctx: ClassContext) {
  if (ctx.classRole !== "teacher") throw new Error("Roster là teacher-only");
  return ctx.db
    .select({
      memberId: classMembers.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      classRole: classMembers.role,
      joinedAt: classMembers.joinedAt,
    })
    .from(classMembers)
    .innerJoin(user, eq(user.id, classMembers.userId))
    .where(eq(classMembers.classId, ctx.classId))
    .orderBy(classMembers.role, user.name);
}

/* ------------------------------- Roster ------------------------------- *
 * Toàn bộ khối này là TEACHER-ONLY. TA không được thấy và không được sửa
 * danh sách lớp — PLAN.md §4.
 * --------------------------------------------------------------------- */

function assertTeacher(ctx: ClassContext) {
  if (ctx.classRole !== "teacher") {
    throw new ForbiddenError("Quản lý danh sách lớp là quyền của giáo viên.");
  }
}

/** Đếm thành viên theo vai trò — dùng cho stat tile, rẻ hơn tải cả roster. */
export async function countMembers(ctx: ClassContext) {
  const rows = await ctx.db
    .select({ role: classMembers.role, n: count() })
    .from(classMembers)
    .where(eq(classMembers.classId, ctx.classId))
    .groupBy(classMembers.role);

  const by = Object.fromEntries(rows.map((r) => [r.role, r.n]));
  return { teacher: by.teacher ?? 0, ta: by.ta ?? 0, student: by.student ?? 0 };
}

/** Thêm TA hoặc học sinh bằng email — tài khoản phải có sẵn (trung tâm cấp). */
export async function addMemberByEmail(
  ctx: ClassContext,
  email: string,
  role: "ta" | "student",
) {
  assertTeacher(ctx);

  const target = await ctx.db.query.user.findFirst({
    where: eq(user.email, email.trim().toLowerCase()),
  });
  if (!target) return { ok: false as const, reason: "no_user" as const };
  if (!target.active) return { ok: false as const, reason: "inactive" as const };

  // Không cho gán TA cho tài khoản học sinh: vai trò trong lớp không được
  // vượt quá vai trò hệ thống.
  if (role === "ta" && target.role !== "ta" && target.role !== "teacher" && target.role !== "admin") {
    return { ok: false as const, reason: "not_ta_account" as const };
  }

  const existing = await ctx.db.query.classMembers.findFirst({
    where: and(eq(classMembers.classId, ctx.classId), eq(classMembers.userId, target.id)),
  });
  if (existing) return { ok: false as const, reason: "already_member" as const };

  await ctx.db.insert(classMembers).values({
    id: crypto.randomUUID(),
    classId: ctx.classId,
    userId: target.id,
    role,
  });
  return { ok: true as const, name: target.name };
}

export async function removeMember(ctx: ClassContext, memberId: string) {
  assertTeacher(ctx);

  const row = await ctx.db.query.classMembers.findFirst({
    where: and(eq(classMembers.id, memberId), eq(classMembers.classId, ctx.classId)),
  });
  if (!row) throw new ForbiddenError("Thành viên không tồn tại trong lớp này.");
  if (row.role === "teacher") {
    throw new ForbiddenError("Không thể gỡ giáo viên khỏi lớp của chính mình.");
  }

  await ctx.db.delete(classMembers).where(eq(classMembers.id, memberId));
}

export async function updateClass(
  ctx: ClassContext,
  input: { name?: string; scheduleNote?: string; archived?: boolean },
) {
  assertTeacher(ctx);

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Tên lớp không được để trống.");
    patch.name = name;
  }
  if (input.scheduleNote !== undefined) patch.scheduleNote = input.scheduleNote.trim() || null;
  if (input.archived !== undefined) patch.archived = input.archived;
  if (Object.keys(patch).length === 0) return;

  await ctx.db.update(classes).set(patch).where(eq(classes.id, ctx.classId));
}

/** Đổi mã lớp — dùng khi mã bị lộ ra ngoài. */
export async function regenerateCode(ctx: ClassContext) {
  assertTeacher(ctx);

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateClassCode();
    const taken = await ctx.db.query.classes.findFirst({ where: eq(classes.code, code) });
    if (taken) continue;
    await ctx.db.update(classes).set({ code }).where(eq(classes.id, ctx.classId));
    return code;
  }
  throw new Error("Không sinh được mã lớp mới. Thử lại giúp mình nhé.");
}

/** Tổng số học sinh (không trùng) trong các lớp giáo viên đang dạy. */
export async function countMyStudents(ctx: AuthContext): Promise<number> {
  const myClasses = await ctx.db
    .select({ id: classes.id })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(and(eq(classMembers.userId, ctx.user.id), eq(classMembers.role, "teacher")));

  if (myClasses.length === 0) return 0;

  const [row] = await ctx.db
    .select({ n: countDistinct(classMembers.userId) })
    .from(classMembers)
    .where(
      and(
        inArray(classMembers.classId, myClasses.map((c) => c.id)),
        eq(classMembers.role, "student"),
      ),
    );
  return row?.n ?? 0;
}
