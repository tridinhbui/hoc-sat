import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, type Db } from "@/db";
import {
  assertClassAccess,
  assertOwnSubmission,
  ForbiddenError,
  type Actor,
} from "./policy";
import { classes, type ClassRole, type Role } from "@/db/schema";
import { getAuth } from "./index";

/* ------------------------------------------------------------------ *
 * HÀNG RÀO PHÂN QUYỀN DUY NHẤT CỦA HỆ THỐNG
 *
 * D1 không có row-level security. Postgres/Supabase chặn được ở tầng DB,
 * ở đây thì không — nếu một truy vấn lọt qua file này, dữ liệu lớp khác
 * sẽ lộ. Vì vậy:
 *
 *   1. Mọi hàm trong `src/lib/repo/**` BẮT BUỘC nhận `AuthContext` /
 *      `ClassContext` làm tham số đầu tiên. Context chỉ sinh ra được từ
 *      file này (kiểu có brand symbol, không tự khai báo được ở nơi khác).
 *   2. Cấm import `@/db` ngoài `src/lib/repo/**` và `src/lib/auth/**`
 *      (ESLint chặn, xem eslint.config.mjs).
 *   3. Mỗi endpoint phải có test phân quyền cho cả 4 role + người ngoài lớp.
 * ------------------------------------------------------------------ */

declare const brand: unique symbol;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  mustChangePassword: boolean;
  active: boolean;
};

export type AuthContext = {
  readonly [brand]: "auth";
  user: SessionUser;
  db: Db;
};

export type ClassContext = AuthContext & {
  readonly classId: string;
  /** Quyền TRONG LỚP này — admin luôn là 'teacher' */
  readonly classRole: ClassRole;
  readonly klass: typeof classes.$inferSelect;
};

export { ForbiddenError };
export * from "./policy";

async function makeContext(user: SessionUser): Promise<AuthContext> {
  return { user, db: await getDb() } as AuthContext;
}

/** Session hiện tại, hoặc null. Không redirect — dùng cho layout công khai. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const u = session.user as unknown as SessionUser;
  // Tài khoản bị vô hiệu hoá coi như chưa đăng nhập.
  if (!u.active) return null;
  return u;
}

/** Đã đăng nhập. Chưa đổi mật khẩu lần đầu → ép sang /change-password. */
export async function requireUser(opts?: { skipPasswordCheck?: boolean }): Promise<AuthContext> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !opts?.skipPasswordCheck) redirect("/change-password");
  return await makeContext(user);
}

/** Đã đăng nhập VÀ có role hệ thống nằm trong danh sách. */
export async function requireRole(...roles: Role[]): Promise<AuthContext> {
  const ctx = await requireUser();
  if (!roles.includes(ctx.user.role)) {
    throw new ForbiddenError(`Chức năng này dành cho: ${roles.join(", ")}.`);
  }
  return ctx;
}

/**
 * Thành viên của lớp VÀ có quyền phù hợp trong lớp đó.
 * Guard được dùng nhiều nhất — gần như mọi trang trong /classes/[id].
 */
export async function requireClassRole(
  classId: string,
  allowed: readonly ClassRole[],
): Promise<ClassContext> {
  const ctx = await requireUser();
  const actor: Actor = { id: ctx.user.id, role: ctx.user.role };
  const { classRole, klass } = await assertClassAccess(ctx.db, actor, classId, allowed);
  return { ...ctx, classId, classRole, klass } as ClassContext;
}

export async function requireOwnSubmission(ctx: AuthContext, submissionId: string) {
  return assertOwnSubmission(ctx.db, ctx.user.id, submissionId);
}
