import { requireClassRole } from "@/lib/auth/guard";
import { ForbiddenError, STAFF } from "@/lib/auth/policy";
import {
  ALLOWED_MIME,
  MAX_UPLOAD_BYTES,
  buildKey,
  getBucket,
} from "@/lib/storage/r2";

const KINDS = ["material", "announcement", "assignment", "submission", "question"] as const;
type Kind = (typeof KINDS)[number];

/**
 * Upload một file lên R2 và trả về mô tả để form gắn kèm.
 *
 * Đi qua route handler thay vì server action vì server action có giới hạn
 * body nhỏ. File lớn hơn MAX_UPLOAD_BYTES phải chuyển sang presigned URL
 * (nợ kỹ thuật, xem PLAN.md §7.9).
 */
export async function POST(req: Request, { params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;

  try {
    // Chỉ giáo viên và TA được up tài liệu. Bài nộp của học sinh sẽ dùng
    // đường riêng ở P2 với guard khác.
    await requireClassRole(classId, STAFF);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return Response.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }

  const form = await req.formData();
  const file = form.get("file");
  const kindRaw = String(form.get("kind") ?? "material");

  if (!(file instanceof File)) {
    return Response.json({ error: "Thiếu file." }, { status: 400 });
  }
  if (!KINDS.includes(kindRaw as Kind)) {
    return Response.json({ error: "Loại file không hợp lệ." }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: "File rỗng." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: `File nặng quá ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.` },
      { status: 413 },
    );
  }
  if (file.type && !ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
    return Response.json({ error: `Không hỗ trợ định dạng ${file.type}.` }, { status: 415 });
  }

  const r2Key = buildKey({ classId, kind: kindRaw as Kind, fileName: file.name });
  const bucket = await getBucket();
  // Truyền thẳng Blob chứ không phải file.stream(): R2 trên Workers đòi
  // stream phải biết trước độ dài, ReadableStream của File thì không có.
  await bucket.put(r2Key, file, {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  return Response.json({
    r2Key,
    fileName: file.name,
    mime: file.type || null,
    size: file.size,
  });
}
