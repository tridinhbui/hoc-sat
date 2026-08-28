import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { attachments, materials, user } from "@/db/schema";
import type { AuthContext, ClassContext } from "@/lib/auth/guard";
import { ForbiddenError, assertClassAccess, canPost, ANY_MEMBER } from "@/lib/auth/policy";
import { getBucket } from "@/lib/storage/r2";

export type UploadedFile = {
  r2Key: string;
  fileName: string;
  mime: string | null;
  size: number | null;
};

export async function listMaterials(ctx: ClassContext) {
  const rows = await ctx.db
    .select({
      id: materials.id,
      title: materials.title,
      description: materials.description,
      createdAt: materials.createdAt,
      authorName: user.name,
    })
    .from(materials)
    .innerJoin(user, eq(user.id, materials.authorId))
    .where(eq(materials.classId, ctx.classId))
    .orderBy(desc(materials.createdAt))
    .limit(100);

  if (rows.length === 0) return [];

  const files = await ctx.db.query.attachments.findMany({
    where: and(
      eq(attachments.ownerType, "material"),
      inArray(attachments.ownerId, rows.map((r) => r.id)),
    ),
  });

  return rows.map((r) => ({ ...r, files: files.filter((f) => f.ownerId === r.id) }));
}

export async function createMaterial(
  ctx: ClassContext,
  input: { title: string; description?: string; files: UploadedFile[] },
) {
  if (!canPost(ctx.classRole)) throw new ForbiddenError("Chỉ giáo viên và TA được đăng tài liệu.");

  const title = input.title.trim();
  if (!title) throw new Error("Tài liệu cần có tiêu đề.");

  // Chỉ nhận file nằm trong đúng thư mục của lớp này — chặn việc gắn key
  // của lớp khác vào tài liệu lớp mình.
  const prefix = `class/${ctx.classId}/`;
  if (input.files.some((f) => !f.r2Key.startsWith(prefix))) {
    throw new ForbiddenError("File không thuộc lớp này.");
  }

  const id = crypto.randomUUID();
  const statements = [
    ctx.db.insert(materials).values({
      id,
      classId: ctx.classId,
      authorId: ctx.user.id,
      title,
      description: input.description?.trim() || null,
    }),
    ...input.files.map((f) =>
      ctx.db.insert(attachments).values({
        id: crypto.randomUUID(),
        ownerType: "material" as const,
        ownerId: id,
        r2Key: f.r2Key,
        fileName: f.fileName,
        mime: f.mime,
        size: f.size,
      }),
    ),
  ];
  await ctx.db.batch(statements as [typeof statements[number], ...typeof statements]);
  return id;
}

export async function deleteMaterial(ctx: ClassContext, id: string) {
  if (!canPost(ctx.classRole)) throw new ForbiddenError();

  const row = await ctx.db.query.materials.findFirst({
    where: and(eq(materials.id, id), eq(materials.classId, ctx.classId)),
  });
  if (!row) throw new ForbiddenError("Tài liệu không tồn tại.");
  if (ctx.classRole !== "teacher" && row.authorId !== ctx.user.id) {
    throw new ForbiddenError("Bạn chỉ xoá được tài liệu của chính mình.");
  }

  const files = await ctx.db.query.attachments.findMany({
    where: and(eq(attachments.ownerType, "material"), eq(attachments.ownerId, id)),
  });

  await ctx.db.batch([
    ctx.db.delete(attachments).where(and(eq(attachments.ownerType, "material"), eq(attachments.ownerId, id))),
    ctx.db.delete(materials).where(eq(materials.id, id)),
  ]);

  // Xoá D1 trước rồi mới xoá R2: nếu R2 lỗi thì chỉ còn file mồ côi,
  // còn làm ngược lại sẽ có bản ghi trỏ vào file không tồn tại.
  const bucket = await getBucket();
  await Promise.all(files.map((f) => bucket.delete(f.r2Key)));
}

/**
 * Tải file đính kèm. Mọi đường tải PHẢI đi qua đây — R2 bucket không public,
 * và quyền được kiểm lại theo lớp chủ quản của file.
 */
export async function resolveAttachmentForDownload(ctx: AuthContext, attachmentId: string) {
  const att = await ctx.db.query.attachments.findFirst({
    where: eq(attachments.id, attachmentId),
  });
  if (!att) throw new ForbiddenError("File không tồn tại.");

  // classId nằm ngay trong key: class/{classId}/...
  const classId = att.r2Key.split("/")[1];
  if (!classId) throw new ForbiddenError("File không hợp lệ.");

  await assertClassAccess(ctx.db, { id: ctx.user.id, role: ctx.user.role }, classId, ANY_MEMBER);
  return att;
}
