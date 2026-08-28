import { env } from "cloudflare:workers";

/**
 * Trong app, binding lấy qua OpenNext (cần dev server của Next khởi tạo trước).
 * Trong test thì miniflare đã cấp binding sẵn, nên trả thẳng env ra —
 * repo vẫn chạy trên D1 và R2 thật chứ không phải mock.
 */
export function getCloudflareContext() {
  return { env, cf: undefined, ctx: undefined };
}

export function initOpenNextCloudflareForDev() {}
