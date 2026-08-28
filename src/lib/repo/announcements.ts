import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { announcements, user } from "@/db/schema";
import type { ClassContext } from "@/lib/auth/guard";
import { ForbiddenError, canPost } from "@/lib/auth/policy";

export async function listAnnouncements(ctx: ClassContext) {
  return ctx.db
    .select({
      id: announcements.id,
      content: announcements.content,
      pinned: announcements.pinned,
      createdAt: announcements.createdAt,
      authorId: announcements.authorId,
      authorName: user.name,
    })
    .from(announcements)
    .innerJoin(user, eq(user.id, announcements.authorId))
    .where(eq(announcements.classId, ctx.classId))
    .orderBy(desc(announcements.pinned), desc(announcements.createdAt))
    .limit(100);
}

export async function createAnnouncement(ctx: ClassContext, content: string) {
  if (!canPost(ctx.classRole)) throw new ForbiddenError("Chỉ giáo viên và TA được đăng thông báo.");

  const trimmed = content.trim();
  if (!trimmed) throw new Error("Thông báo trống.");
  if (trimmed.length > 5000) throw new Error("Thông báo dài quá 5000 ký tự.");

  const id = crypto.randomUUID();
  await ctx.db.insert(announcements).values({
    id,
    classId: ctx.classId,
    authorId: ctx.user.id,
    content: trimmed,
  });
  return id;
}

/** TA xoá được thông báo của chính mình; giáo viên xoá được mọi thông báo trong lớp. */
export async function deleteAnnouncement(ctx: ClassContext, id: string) {
  if (!canPost(ctx.classRole)) throw new ForbiddenError();

  const row = await ctx.db.query.announcements.findFirst({
    where: and(eq(announcements.id, id), eq(announcements.classId, ctx.classId)),
  });
  if (!row) throw new ForbiddenError("Thông báo không tồn tại.");
  if (ctx.classRole !== "teacher" && row.authorId !== ctx.user.id) {
    throw new ForbiddenError("Bạn chỉ xoá được thông báo của chính mình.");
  }

  await ctx.db.delete(announcements).where(eq(announcements.id, id));
}

export async function togglePin(ctx: ClassContext, id: string, pinned: boolean) {
  if (ctx.classRole !== "teacher") throw new ForbiddenError("Chỉ giáo viên được ghim thông báo.");
  await ctx.db
    .update(announcements)
    .set({ pinned })
    .where(and(eq(announcements.id, id), eq(announcements.classId, ctx.classId)));
}
