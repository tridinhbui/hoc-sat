/// <reference types="@cloudflare/vitest-plugin/types" />

// Binding chỉ tồn tại khi chạy test: mảng migration đọc từ ./drizzle,
// setup.ts dùng để apply lên D1 của miniflare.
declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }
}
