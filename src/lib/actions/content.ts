"use server";

import { revalidatePath } from "next/cache";
import { requireClassRole } from "@/lib/auth/guard";
import { STAFF } from "@/lib/auth/policy";
import {
  createAnnouncement,
  deleteAnnouncement,
  togglePin,
} from "@/lib/repo/announcements";
import { createMaterial, deleteMaterial, type UploadedFile } from "@/lib/repo/materials";
import type { ActionState } from "./classes";

/** Đường dẫn tab thay đổi theo role, nên revalidate cả ba nhánh. */
function revalidateClass(classId: string, tab: string) {
  for (const role of ["teacher", "ta", "student"]) {
    revalidatePath(`/${role}/classes/${classId}/${tab}`);
  }
}

/* ---------------------------- Thông báo ---------------------------- */

export async function postAnnouncementAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, STAFF);

  const content = String(form.get("content") ?? "");
  if (!content.trim()) return { error: "Viết gì đó đã nhé." };

  await createAnnouncement(ctx, content);
  revalidateClass(classId, "stream");
  return { ok: "Đã đăng." };
}

/** Dùng trực tiếp trong <form action=...>, không qua useActionState. */
export async function deleteAnnouncementAction(form: FormData): Promise<void> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, STAFF);

  await deleteAnnouncement(ctx, String(form.get("id") ?? ""));
  revalidateClass(classId, "stream");
}

/** Dùng trực tiếp trong <form action=...>, không qua useActionState. */
export async function togglePinAction(form: FormData): Promise<void> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, STAFF);

  await togglePin(ctx, String(form.get("id") ?? ""), form.get("pinned") === "true");
  revalidateClass(classId, "stream");
}

/* ---------------------------- Tài liệu ---------------------------- */

export async function createMaterialAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, STAFF);

  const title = String(form.get("title") ?? "");
  if (!title.trim()) return { error: "Tài liệu cần có tiêu đề." };

  // File đã được route handler /api/classes/[classId]/upload đẩy lên R2 trước,
  // ở đây chỉ nhận lại mô tả. Repo kiểm tra key có đúng thuộc lớp này không.
  let files: UploadedFile[] = [];
  const raw = String(form.get("files") ?? "");
  if (raw) {
    try {
      files = JSON.parse(raw) as UploadedFile[];
    } catch {
      return { error: "Danh sách file không hợp lệ." };
    }
  }

  await createMaterial(ctx, {
    title,
    description: String(form.get("description") ?? ""),
    files,
  });
  revalidateClass(classId, "materials");
  return { ok: "Đã đăng tài liệu." };
}

/** Dùng trực tiếp trong <form action=...>, không qua useActionState. */
export async function deleteMaterialAction(form: FormData): Promise<void> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, STAFF);

  await deleteMaterial(ctx, String(form.get("id") ?? ""));
  revalidateClass(classId, "materials");
}
