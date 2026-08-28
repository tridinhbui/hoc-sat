import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { classes, classMembers, user } from "@/db/schema";
import type { AuthContext, ClassContext } from "@/lib/auth/guard";
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
