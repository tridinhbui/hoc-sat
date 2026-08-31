"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guard";
import { isRole, type Role } from "@/lib/users/roles";
import {
  createUser,
  createUsers,
  resetPassword,
  setUserActive,
  setUserRole,
  type CreatedUser,
} from "@/lib/repo/users";
import { parseCsv } from "@/lib/utils/csv";
import { sendCredentials } from "@/lib/email/credentials";
import type { ActionState } from "./classes";

/* ------------------------------------------------------------------ *
 * Mật khẩu tạm chỉ đi qua giá trị trả về của action rồi hiện trên màn
 * hình đúng một lần. Không ghi vào log, không nhét vào URL, không lưu
 * lại — trong DB chỉ có hash.
 * ------------------------------------------------------------------ */

export type AdminState =
  | (ActionState & { created?: CreatedUser[]; failed?: { line: number; message: string }[] })
  | null;

const asRole = (v: unknown): Role | null => (isRole(v) ? v : null);

export async function createUserAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  const ctx = await requireRole("admin");

  const role = asRole(String(form.get("role") ?? ""));
  if (!role) return { error: "Chọn vai trò cho tài khoản." };

  try {
    const created = await createUser(ctx, {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      role,
      phone: String(form.get("phone") ?? ""),
    });
    // Gửi mật khẩu tạm qua email. Không chặn luồng và không làm hỏng việc
    // tạo tài khoản nếu email lỗi — màn hình vẫn hiện mật khẩu để admin
    // đọc cho học sinh.
    const mailed = await sendCredentials([created]);

    revalidatePath("/admin/users");
    return {
      ok: mailed
        ? `Đã tạo tài khoản cho ${created.email} và gửi mật khẩu qua email.`
        : `Đã tạo tài khoản cho ${created.email}. Chưa gửi được email — đọc mật khẩu tạm bên dưới cho người dùng.`,
      created: [created],
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không tạo được tài khoản." };
  }
}

/**
 * CSV: `name,email,role,phone`. Dòng tiêu đề bỏ qua nếu ô đầu là "name".
 * Số dòng báo lỗi tính theo file gốc để admin mở ra sửa đúng chỗ.
 */
export async function importUsersAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  const ctx = await requireRole("admin");

  const text = String(form.get("csv") ?? "").trim();
  if (!text) return { error: "Dán nội dung CSV vào đã nhé." };

  const rows = parseCsv(text);
  const hasHeader = rows[0]?.[0]?.trim().toLowerCase() === "name";
  const body = hasHeader ? rows.slice(1) : rows;
  const offset = hasHeader ? 2 : 1;

  const parsed = body.map((r, i) => ({
    line: i + offset,
    name: r[0] ?? "",
    email: r[1] ?? "",
    role: asRole((r[2] ?? "").trim().toLowerCase()) ?? ("student" as Role),
    phone: r[3] ?? "",
  }));

  if (parsed.length === 0) return { error: "Không đọc được dòng nào." };

  const res = await createUsers(ctx, parsed);
  revalidatePath("/admin/users");

  if (res.created.length === 0) {
    return { error: "Không tạo được tài khoản nào.", failed: res.errors };
  }

  const mailed = await sendCredentials(res.created);
  const skipped = res.errors.length ? `, bỏ qua ${res.errors.length} dòng lỗi` : "";

  return {
    ok: mailed
      ? `Đã tạo ${res.created.length} tài khoản và gửi mật khẩu qua email${skipped}.`
      : `Đã tạo ${res.created.length} tài khoản${skipped}. Chưa gửi được email — đọc mật khẩu tạm bên dưới cho từng người.`,
    created: res.created,
    failed: res.errors,
  };
}

export async function resetPasswordAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  const ctx = await requireRole("admin");
  const userId = String(form.get("userId") ?? "");

  try {
    const pw = await resetPassword(ctx, userId);
    const target = String(form.get("email") ?? userId);
    const name = String(form.get("name") ?? "");

    const mailed = await sendCredentials([{ name, email: target, tempPassword: pw }]);
    revalidatePath("/admin/users");

    return {
      ok: mailed
        ? `Đã đặt lại mật khẩu cho ${target} và gửi qua email.`
        : `Đã đặt lại mật khẩu cho ${target}. Chưa gửi được email — đọc mật khẩu tạm bên dưới.`,
      created: [{ id: userId, email: target, tempPassword: pw }],
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không đặt lại được mật khẩu." };
  }
}

export async function setActiveAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  const ctx = await requireRole("admin");
  const userId = String(form.get("userId") ?? "");
  const active = String(form.get("active") ?? "") === "1";

  try {
    await setUserActive(ctx, userId, active);
    revalidatePath("/admin/users");
    return { ok: active ? "Đã mở lại tài khoản." : "Đã khoá tài khoản." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không đổi được trạng thái." };
  }
}

export async function setRoleAction(_prev: AdminState, form: FormData): Promise<AdminState> {
  const ctx = await requireRole("admin");
  const userId = String(form.get("userId") ?? "");
  const role = asRole(String(form.get("role") ?? ""));
  if (!role) return { error: "Vai trò không hợp lệ." };

  try {
    await setUserRole(ctx, userId, role);
    revalidatePath("/admin/users");
    return { ok: "Đã đổi vai trò." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không đổi được vai trò." };
  }
}
