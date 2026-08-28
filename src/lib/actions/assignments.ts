"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClassRole } from "@/lib/auth/guard";
import { ANY_MEMBER, STAFF, TEACHER_ONLY } from "@/lib/auth/policy";
import {
  createAssignment,
  deleteAssignment,
  gradeSubmission,
  returnAllGraded,
  returnSubmission,
  setPublished,
  turnIn,
  unsubmit,
  updateAssignment,
} from "@/lib/repo/assignments";
import type { UploadedFile } from "@/lib/repo/materials";
import { notifyGradeReturned, notifyNewAssignment } from "@/lib/email/notify";
import type { ActionState } from "./classes";

function revalidateClass(classId: string, ...tabs: string[]) {
  for (const role of ["teacher", "ta", "student"]) {
    for (const tab of tabs) revalidatePath(`/${role}/classes/${classId}/${tab}`, "page");
    revalidatePath(`/${role}`);
  }
}

function parseFiles(form: FormData): UploadedFile[] {
  const raw = String(form.get("files") ?? "");
  if (!raw) return [];
  try {
    return JSON.parse(raw) as UploadedFile[];
  } catch {
    return [];
  }
}

/**
 * Ô datetime-local gửi lên dạng "2026-09-01T21:30" theo giờ NGƯỜI DÙNG.
 * Trung tâm chạy một múi giờ duy nhất nên quy đổi thẳng từ +07:00,
 * không phụ thuộc múi giờ của máy chủ.
 */
function parseDueAt(raw: string): Date | null {
  const v = raw.trim();
  if (!v) return null;
  const d = new Date(`${v}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ---------------------------- Giao bài ---------------------------- */

export async function createAssignmentAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, STAFF);

  const title = String(form.get("title") ?? "");
  if (!title.trim()) return { error: "Bài tập cần có tiêu đề." };

  const points = Number(form.get("points") ?? 100);
  if (!Number.isFinite(points) || points <= 0) return { error: "Điểm tối đa phải là số dương." };

  let id: string;
  try {
    id = await createAssignment(ctx, {
      title,
      description: String(form.get("description") ?? ""),
      dueAt: parseDueAt(String(form.get("dueAt") ?? "")),
      points,
      allowLate: form.get("allowLate") === "on",
      publish: form.get("intent") === "publish",
      files: parseFiles(form),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không tạo được bài tập." };
  }

  // Giao bài ngay thì báo cả lớp. Lưu nháp thì không — chưa ai cần biết.
  if (form.get("intent") === "publish") await notifyNewAssignment(ctx, id);

  revalidateClass(classId, "assignments");
  redirect(`/${ctx.classRole === "ta" ? "ta" : "teacher"}/classes/${classId}/assignments/${id}`);
}

export async function updateAssignmentAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, STAFF);

  try {
    await updateAssignment(ctx, String(form.get("assignmentId") ?? ""), {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      dueAt: parseDueAt(String(form.get("dueAt") ?? "")),
      points: Number(form.get("points") ?? 100),
      allowLate: form.get("allowLate") === "on",
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không lưu được." };
  }

  revalidateClass(classId, "assignments");
  return { ok: "Đã lưu." };
}

export async function setPublishedAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, STAFF);

  const publish = form.get("publish") === "true";
  const assignmentId = String(form.get("assignmentId") ?? "");

  try {
    await setPublished(ctx, assignmentId, publish);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không đổi được trạng thái." };
  }

  // Chỉ báo khi chuyển từ nháp sang đã giao; rút về nháp thì im lặng.
  if (publish) await notifyNewAssignment(ctx, assignmentId);

  revalidateClass(classId, "assignments");
  return { ok: form.get("publish") === "true" ? "Đã giao cho lớp." : "Đã rút về nháp." };
}

export async function deleteAssignmentAction(form: FormData): Promise<void> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, TEACHER_ONLY);

  await deleteAssignment(ctx, String(form.get("assignmentId") ?? ""));
  revalidateClass(classId, "assignments");
  redirect(`/teacher/classes/${classId}/assignments`);
}

/* ---------------------------- Nộp bài ---------------------------- */

export async function turnInAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, ANY_MEMBER);

  try {
    await turnIn(ctx, String(form.get("assignmentId") ?? ""), parseFiles(form));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không nộp được bài." };
  }

  revalidateClass(classId, "assignments", "grades");
  return { ok: "Đã nộp! Ngon lành 🎉" };
}

export async function unsubmitAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, ANY_MEMBER);

  try {
    await unsubmit(ctx, String(form.get("assignmentId") ?? ""));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không huỷ nộp được." };
  }

  revalidateClass(classId, "assignments");
  return { ok: "Đã huỷ nộp. Nhớ nộp lại nhé." };
}

/* ---------------------------- Chấm bài ---------------------------- */

export async function gradeAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, STAFF);

  const rawScore = String(form.get("score") ?? "").trim();
  const score = rawScore === "" ? null : Number(rawScore);
  if (score !== null && !Number.isFinite(score)) return { error: "Điểm phải là số." };

  try {
    await gradeSubmission(ctx, String(form.get("submissionId") ?? ""), {
      score,
      feedback: String(form.get("feedback") ?? ""),
    });
    // Chấm và trả trong một lần bấm nếu giáo viên chọn vậy.
    if (form.get("intent") === "grade_and_return") {
      const submissionId = String(form.get("submissionId") ?? "");
      await returnSubmission(ctx, submissionId);
      await notifyGradeReturned(ctx, [submissionId]);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không lưu được điểm." };
  }

  revalidateClass(classId, "assignments", "grades");
  return { ok: form.get("intent") === "grade_and_return" ? "Đã chấm và trả bài." : "Đã lưu điểm." };
}

export async function returnAllAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, STAFF);

  let ids: string[] = [];
  try {
    ids = await returnAllGraded(ctx, String(form.get("assignmentId") ?? ""));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không trả bài được." };
  }

  await notifyGradeReturned(ctx, ids);

  revalidateClass(classId, "assignments", "grades");
  return ids.length === 0
    ? { error: "Chưa có bài nào đã chấm để trả." }
    : { ok: `Đã trả ${ids.length} bài.` };
}
