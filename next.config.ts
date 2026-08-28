import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ảnh đề bài phục vụ từ R2 qua route handler của chính app,
  // không mở remotePatterns ra host ngoài (tránh lặp lại CVE-2025-6087 SSRF của /_next/image).
  images: { remotePatterns: [] },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;

// Bật binding Cloudflare trong `next dev` (D1/R2/KV chạy local qua miniflare).
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
