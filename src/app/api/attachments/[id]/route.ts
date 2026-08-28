import { requireUser } from "@/lib/auth/guard";
import { ForbiddenError } from "@/lib/auth/policy";
import { resolveAttachmentForDownload } from "@/lib/repo/materials";
import { downloadHeaders, getBucket } from "@/lib/storage/r2";

/**
 * Đường tải file DUY NHẤT. Bucket R2 không public — quyền được kiểm lại
 * theo lớp chủ quản của file ở mỗi lần tải.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireUser();

  let att;
  try {
    att = await resolveAttachmentForDownload(ctx, id);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return Response.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }

  const bucket = await getBucket();
  const obj = await bucket.get(att.r2Key);
  if (!obj) return Response.json({ error: "File không còn trên hệ thống." }, { status: 404 });

  return new Response(obj.body, {
    headers: downloadHeaders(att.fileName, att.mime, att.size),
  });
}
