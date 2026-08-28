import { requireUser } from "@/lib/auth/guard";
import { ANY_MEMBER, ForbiddenError, assertClassAccess } from "@/lib/auth/policy";
import { downloadHeaders, getBucket } from "@/lib/storage/r2";

/**
 * Ảnh trong đề (biểu đồ Math, đoạn văn RW).
 *
 * Ảnh không nằm trong bảng `attachments` mà là một cột trên `questions`,
 * nên quyền được kiểm theo `classId` nhúng ngay trong key:
 * `class/{classId}/question/{uuid}/{name}`.
 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return Response.json({ error: "Thiếu key." }, { status: 400 });

  const parts = key.split("/");
  if (parts[0] !== "class" || parts[2] !== "question" || parts.length < 5) {
    return Response.json({ error: "Key không hợp lệ." }, { status: 400 });
  }

  const ctx = await requireUser();
  try {
    await assertClassAccess(
      ctx.db,
      { id: ctx.user.id, role: ctx.user.role },
      parts[1],
      ANY_MEMBER,
    );
  } catch (e) {
    if (e instanceof ForbiddenError) return Response.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const obj = await (await getBucket()).get(key);
  if (!obj) return Response.json({ error: "Ảnh không còn trên hệ thống." }, { status: 404 });

  const headers = downloadHeaders(
    parts.at(-1)!,
    obj.httpMetadata?.contentType ?? "image/png",
    obj.size,
  );
  // Ảnh đề phải hiện ngay trong trang chứ không tải về.
  headers.delete("Content-Disposition");
  return new Response(obj.body, { headers });
}
