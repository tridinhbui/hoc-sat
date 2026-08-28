import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Giới hạn mềm cho upload đi qua Worker. File lớn hơn phải dùng presigned URL (xem PLAN.md §7.9). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ALLOWED_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
] as const;

export async function getBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  return env.FILES;
}

/**
 * Key R2 luôn bắt đầu bằng classId để dữ liệu của một lớp nằm gọn một chỗ
 * (dễ xoá khi lớp bị gỡ, dễ soi khi cần audit).
 */
export function buildKey(opts: {
  classId: string;
  kind: "material" | "announcement" | "assignment" | "submission" | "question";
  fileName: string;
}) {
  // Tên file người dùng đặt không bao giờ được đi thẳng vào key.
  const safe = opts.fileName
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}._-]+/gu, "_")
    .slice(-120);
  return `class/${opts.classId}/${opts.kind}/${crypto.randomUUID()}/${safe}`;
}

/** Ép tải về thay vì render inline — tránh HTML/SVG do người dùng up chạy script trên origin của app. */
export function downloadHeaders(fileName: string, mime: string | null, size: number | null) {
  const headers = new Headers();
  headers.set("Content-Type", mime ?? "application/octet-stream");
  headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "private, max-age=300");
  if (size != null) headers.set("Content-Length", String(size));
  return headers;
}
