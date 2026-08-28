import "server-only";
import { eq, inArray } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { account, session, user, ROLES } from "@/db/schema";
import { isRole, type Role } from "@/lib/users/roles";
import type { AuthContext } from "@/lib/auth/guard";
import { ForbiddenError } from "@/lib/auth/policy";

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


/* ================================================================== *
 * QUẢN TRỊ TÀI KHOẢN (admin)
 *
 * better-auth đang bật `disableSignUp` — không có đường tự đăng ký. Đây
 * là nơi DUY NHẤT sinh ra tài khoản, nên mọi hàm dưới đây tự kiểm role
 * chứ không tin nơi gọi.
 *
 * Mật khẩu chỉ tồn tại ở dạng rõ đúng một lần: giá trị trả về của
 * `createUser` / `resetPassword`, để admin đọc cho người dùng. Trong DB
 * chỉ có hash của better-auth, không có cột nào giữ bản rõ.
 * ================================================================== */

// Danh sách vai trò dùng chung lệch với CHECK trong schema thì gãy ở typecheck.
const _rolesMatchSchema: readonly Role[] = ROLES;
void _rolesMatchSchema;

function assertAdmin(ctx: AuthContext) {
  if (ctx.user.role !== "admin") {
    throw new ForbiddenError("Chức năng này dành cho quản trị viên.");
  }
}

// Bỏ 0 O 1 I L để admin đọc mật khẩu qua điện thoại không bị nghe nhầm.
const PW_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/** Mật khẩu tạm 12 ký tự — dài hơn mức tối thiểu 8 của better-auth. */
export function generateTempPassword(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += PW_ALPHABET[b % PW_ALPHABET.length];
  return out;
}

const normalizeEmail = (e: string) => e.trim().toLowerCase();

export type NewUserInput = {
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
};

export type CreatedUser = { id: string; email: string; tempPassword: string };

/**
 * Tạo tài khoản kèm mật khẩu tạm. Ghi cả `user` và `account` trong một
 * batch: có `user` mà thiếu `account` thì tài khoản tồn tại nhưng không
 * đăng nhập được, và không có thông báo lỗi nào nói ra điều đó.
 */
export async function createUser(ctx: AuthContext, input: NewUserInput): Promise<CreatedUser> {
  assertAdmin(ctx);

  const email = normalizeEmail(input.email);
  const name = input.name.trim();

  if (!name) throw new Error("Thiếu họ tên.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error(`Email không hợp lệ: ${input.email}`);
  if (!isRole(input.role)) throw new Error(`Vai trò không hợp lệ: ${input.role}`);

  const existing = await ctx.db.query.user.findFirst({ where: eq(user.email, email) });
  if (existing) throw new Error(`Email đã có tài khoản: ${email}`);

  const id = crypto.randomUUID();
  const tempPassword = generateTempPassword();
  const now = new Date();

  await ctx.db.batch([
    ctx.db.insert(user).values({
      id,
      name,
      email,
      emailVerified: true,
      role: input.role,
      phone: input.phone?.trim() || null,
      mustChangePassword: true,
      active: true,
      createdAt: now,
      updatedAt: now,
    }),
    ctx.db.insert(account).values({
      id: crypto.randomUUID(),
      userId: id,
      accountId: id,
      providerId: "credential",
      // Thiếu cột này thì sign-in trả 401 không kèm lý do — xem PLAN.md §8.
      issuer: "local:credential",
      password: await hashPassword(tempPassword),
      createdAt: now,
      updatedAt: now,
    }),
  ]);

  return { id, email, tempPassword };
}

export type ImportOutcome = {
  created: CreatedUser[];
  errors: { line: number; message: string }[];
};

/**
 * Nhập nhiều tài khoản. Dòng lỗi bị bỏ qua và báo lại, các dòng còn lại
 * vẫn tạo — nhập 40 học sinh mà một dòng sai chính tả thì không có lý do
 * gì bắt admin làm lại từ đầu.
 */
export async function createUsers(
  ctx: AuthContext,
  rows: (NewUserInput & { line: number })[],
): Promise<ImportOutcome> {
  assertAdmin(ctx);

  const out: ImportOutcome = { created: [], errors: [] };
  const seen = new Set<string>();

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    // Trùng ngay trong chính file CSV — DB chưa có nên vòng kiểm dưới không bắt được.
    if (seen.has(email)) {
      out.errors.push({ line: row.line, message: `Email lặp lại trong file: ${email}` });
      continue;
    }
    seen.add(email);

    try {
      out.created.push(await createUser(ctx, row));
    } catch (e) {
      out.errors.push({ line: row.line, message: e instanceof Error ? e.message : "Lỗi không rõ" });
    }
  }

  return out;
}

/**
 * Đặt lại mật khẩu và ép đổi ở lần đăng nhập kế.
 *
 * Xoá luôn session đang mở: đổi mật khẩu mà phiên cũ vẫn sống thì việc
 * đặt lại chẳng ngăn được ai — trường hợp cần nhất chính là khi tài khoản
 * nghi bị người khác dùng.
 */
export async function resetPassword(ctx: AuthContext, userId: string): Promise<string> {
  assertAdmin(ctx);

  const target = await ctx.db.query.user.findFirst({ where: eq(user.id, userId) });
  if (!target) throw new Error("Không tìm thấy tài khoản.");

  const tempPassword = generateTempPassword();
  const now = new Date();

  await ctx.db.batch([
    ctx.db
      .update(account)
      .set({ password: await hashPassword(tempPassword), updatedAt: now })
      .where(eq(account.userId, userId)),
    ctx.db
      .update(user)
      .set({ mustChangePassword: true, updatedAt: now })
      .where(eq(user.id, userId)),
    ctx.db.delete(session).where(eq(session.userId, userId)),
  ]);

  return tempPassword;
}

/**
 * Khoá / mở tài khoản. Khoá thì xoá session luôn, nếu không người đang
 * đăng nhập vẫn dùng tiếp tới khi cookie cache hết hạn.
 */
export async function setUserActive(ctx: AuthContext, userId: string, active: boolean) {
  assertAdmin(ctx);

  // Admin tự khoá mình là tự nhốt ngoài cửa, và không có ai mở hộ.
  if (userId === ctx.user.id && !active) {
    throw new ForbiddenError("Không thể tự khoá tài khoản của chính mình.");
  }

  const target = await ctx.db.query.user.findFirst({ where: eq(user.id, userId) });
  if (!target) throw new Error("Không tìm thấy tài khoản.");

  const now = new Date();
  const flip = ctx.db.update(user).set({ active, updatedAt: now }).where(eq(user.id, userId));

  if (active) {
    await flip;
    return;
  }
  await ctx.db.batch([flip, ctx.db.delete(session).where(eq(session.userId, userId))]);
}

/** Đổi vai trò hệ thống. */
export async function setUserRole(ctx: AuthContext, userId: string, role: Role) {
  assertAdmin(ctx);

  if (!isRole(role)) throw new Error(`Vai trò không hợp lệ: ${role}`);
  // Hạ quyền chính mình cũng là tự nhốt ngoài cửa.
  if (userId === ctx.user.id && role !== "admin") {
    throw new ForbiddenError("Không thể tự bỏ quyền quản trị của mình.");
  }

  const target = await ctx.db.query.user.findFirst({ where: eq(user.id, userId) });
  if (!target) throw new Error("Không tìm thấy tài khoản.");

  await ctx.db
    .update(user)
    .set({ role, updatedAt: new Date() })
    .where(eq(user.id, userId));
}

/** Số lớp mỗi người đang tham gia — để admin biết xoá/khoá ai thì ảnh hưởng gì. */
export async function countClassesForUsers(ctx: AuthContext, userIds: string[]) {
  assertAdmin(ctx);
  if (userIds.length === 0) return new Map<string, number>();

  const rows = await ctx.db.query.classMembers.findMany({
    where: (m) => inArray(m.userId, userIds),
    columns: { userId: true },
  });

  const out = new Map<string, number>();
  for (const r of rows) out.set(r.userId, (out.get(r.userId) ?? 0) + 1);
  return out;
}
