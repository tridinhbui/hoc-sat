import { requireClassRole } from "@/lib/auth/guard";
import { ANY_MEMBER, ForbiddenError, STAFF } from "@/lib/auth/policy";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, buildKey, getBucket } from "@/lib/storage/r2";

const KINDS = ["material", "announcement", "assignment", "submission", "question"] as const;
type Kind = (typeof KINDS)[number];

/**
 * Upload một file lên R2 và trả về mô tả để form gắn kèm.
 *
 * `kind` nằm ở query string chứ không ở body: cần biết loại file để chọn
 * guard, mà kiểm quyền phải xong TRƯỚC khi bỏ công parse một body 25MB.
 *
 * Đi qua route handler thay vì server action vì server action giới hạn body
 * nhỏ. File lớn hơn MAX_UPLOAD_BYTES cần presigned URL (xem PLAN.md §7.9).
 */
export async function POST(req: Request, { params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const kind = new URL(req.url).searchParams.get("kind") ?? "material";

  if (!KINDS.includes(kind as Kind)) {
    return Response.json({ error: "Loại file không hợp lệ." }, { status: 400 });
  }

  try {
    // Học sinh chỉ được up file cho bài nộp của mình; mọi loại khác là
    // quyền của giáo viên và TA.
    await requireClassRole(classId, kind === "submission" ? ANY_MEMBER : STAFF);
  } catch (e) {
    if (e instanceof ForbiddenError) return Response.json({ error: e.message }, { status: 403 });
    throw e;
  }

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES * 1.1) {
    return Response.json(
      { error: `File nặng quá ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.` },
      { status: 413 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) return Response.json({ error: "Thiếu file." }, { status: 400 });
  if (file.size === 0) return Response.json({ error: "File rỗng." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: `File nặng quá ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.` },
      { status: 413 },
    );
  }
  if (file.type && !ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
    return Response.json({ error: `Không hỗ trợ định dạng ${file.type}.` }, { status: 415 });
  }

  const r2Key = buildKey({ classId, kind: kind as Kind, fileName: file.name });
  const bucket = await getBucket();
  // Truyền thẳng Blob chứ không phải file.stream(): R2 trên Workers đòi
  // stream phải biết trước độ dài, ReadableStream của File thì không có.
  await bucket.put(r2Key, file, {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  return Response.json({ r2Key, fileName: file.name, mime: file.type || null, size: file.size });
}
