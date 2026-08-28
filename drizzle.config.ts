import type { Config } from "drizzle-kit";

// Chỉ dùng để `drizzle-kit generate` ra file SQL trong ./drizzle.
// Việc apply do `wrangler d1 migrations apply` lo (đọc đúng thư mục này).
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
} satisfies Config;
