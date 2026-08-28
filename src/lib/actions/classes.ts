"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClassRole, requireRole, requireUser } from "@/lib/auth/guard";
import { TEACHER_ONLY } from "@/lib/auth/policy";
import {
  addMemberByEmail,
  createClass,
  joinClassByCode,
  regenerateCode,
  removeMember,
  updateClass,
} from "@/lib/repo/classes";
import { isValidClassCode } from "@/lib/utils/class-code";

export type ActionState = { error?: string; ok?: string } | null;

/* ------------------------------ Tạo lớp ------------------------------ */

export async function createClassAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireRole("teacher", "admin");

  const name = String(form.get("name") ?? "").trim();
  const subject = String(form.get("subject") ?? "");

  if (!name) return { error: "Đặt tên cho lớp giúp mình nhé." };
  if (subject !== "rw" && subject !== "math") {
    return { error: "Chọn loại lớp: Reading & Writing hoặc Math." };
  }

  const { id } = await createClass(ctx, {
    name,
    subject,
    scheduleNote: String(form.get("scheduleNote") ?? "").trim() || undefined,
  });

  revalidatePath("/teacher");
  redirect(`/teacher/classes/${id}/stream`);
}

/* --------------------------- Vào lớp bằng mã --------------------------- */

export async function joinClassAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireUser();

  const code = String(form.get("code") ?? "").trim().toUpperCase();
  if (!isValidClassCode(code)) {
    return { error: "Mã lớp gồm 6 ký tự chữ và số. Kiểm tra lại giúp mình nhé." };
  }

  const res = await joinClassByCode(ctx, code);
  if (!res.ok) return { error: "Mã này không đúng rồi. Kiểm tra lại giúp mình nhé." };

  revalidatePath("/student");
  redirect(`/student/classes/${res.classId}/stream`);
}

/* ------------------------------ Roster ------------------------------ */

export async function addMemberAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, TEACHER_ONLY);

  const email = String(form.get("email") ?? "").trim();
  const role = String(form.get("role") ?? "student");
  if (!email) return { error: "Nhập email của người cần thêm." };
  if (role !== "ta" && role !== "student") return { error: "Vai trò không hợp lệ." };

  const res = await addMemberByEmail(ctx, email, role);
  if (!res.ok) {
    const messages = {
      no_user: "Không tìm thấy tài khoản với email này. Nhờ admin tạo tài khoản trước nhé.",
      inactive: "Tài khoản này đang bị khoá.",
      not_ta_account: "Tài khoản này không phải tài khoản trợ giảng. Nhờ admin đổi vai trò trước.",
      already_member: "Người này đã ở trong lớp rồi.",
    };
    return { error: messages[res.reason] };
  }

  revalidatePath(`/teacher/classes/${classId}/people`);
  return { ok: `Đã thêm ${res.name} vào lớp.` };
}

export async function removeMemberAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, TEACHER_ONLY);

  await removeMember(ctx, String(form.get("memberId") ?? ""));
  revalidatePath(`/teacher/classes/${classId}/people`);
  return { ok: "Đã gỡ khỏi lớp." };
}

/* ---------------------------- Cài đặt lớp ---------------------------- */

export async function updateClassAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, TEACHER_ONLY);

  await updateClass(ctx, {
    name: String(form.get("name") ?? ""),
    scheduleNote: String(form.get("scheduleNote") ?? ""),
    archived: form.get("archived") === "on",
  });

  revalidatePath(`/teacher/classes/${classId}`, "layout");
  return { ok: "Đã lưu." };
}

export async function regenerateCodeAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, TEACHER_ONLY);

  const code = await regenerateCode(ctx);
  revalidatePath(`/teacher/classes/${classId}`, "layout");
  return { ok: `Mã lớp mới: ${code}. Mã cũ không dùng được nữa.` };
}
