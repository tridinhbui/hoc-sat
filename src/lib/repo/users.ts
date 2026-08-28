import "server-only";
import { eq } from "drizzle-orm";
import { user } from "@/db/schema";
import type { AuthContext } from "@/lib/auth/guard";

/**
 * Mọi hàm ở đây nhận AuthContext đã qua guard làm tham số đầu tiên.
 * Không có cửa nào khác vào bảng `user`.
 */

export async function setPasswordChanged(ctx: AuthContext) {
  await ctx.db
    .update(user)
    .set({ mustChangePassword: false, updatedAt: new Date() })
    .where(eq(user.id, ctx.user.id));
}

export async function getProfile(ctx: AuthContext, userId: string) {
  // Chỉ được xem hồ sơ của chính mình, trừ admin.
  if (ctx.user.role !== "admin" && userId !== ctx.user.id) return null;
  return ctx.db.query.user.findFirst({ where: eq(user.id, userId) });
}

/** Admin-only — gọi sau requireRole("admin"). */
export async function listAllUsers(ctx: AuthContext) {
  if (ctx.user.role !== "admin") throw new Error("listAllUsers cần role admin");
  return ctx.db.query.user.findMany({ orderBy: (u, { desc }) => [desc(u.createdAt)], limit: 200 });
}
