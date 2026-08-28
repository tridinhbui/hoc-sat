import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Test phân quyền chạy trên D1 THẬT (miniflare) với đúng migration của production.
// Không mock DB: luật phân quyền là SQL, mock đi thì test mất hết ý nghĩa.
export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      miniflare: {
        compatibilityDate: "2026-08-01",
        compatibilityFlags: ["nodejs_compat"],
        d1Databases: ["DB"],
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(
            path.join(import.meta.dirname, "drizzle"),
          ),
        },
      },
    })),
  ],
  resolve: {
    alias: {
      "@": path.join(import.meta.dirname, "src"),
      "server-only": path.join(import.meta.dirname, "tests/stubs/empty.ts"),
    },
  },
  test: {
    setupFiles: ["./tests/setup.ts"],
  },
});
