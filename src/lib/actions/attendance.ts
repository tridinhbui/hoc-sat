"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClassRole } from "@/lib/auth/guard";
import { STAFF, TEACHER_ONLY } from "@/lib/auth/policy";
import { deleteSession, markSession, openSession } from "@/lib/repo/attendance";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/attendance/types";
import type { ActionState } from "./classes";

function revalidateAttendance(classId: string) {
  for (const role of ["teacher", "ta", "student"]) {
    revalidatePath(`/${role}/classes/${classId}/attendance`, "layout");
    revalidatePath(`/${role}`);
  }
}

/** Mở (hoặc mở lại) buổi điểm danh rồi nhảy thẳng vào danh sách lớp. */
export async function openSessionAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, STAFF);
  const role = ctx.classRole === "ta" ? "ta" : "teacher";

  let sessionId: string;
  try {
    const s = await openSession(
      ctx,
      String(form.get("sessionDate") ?? ""),
      String(form.get("title") ?? ""),
    );
    sessionId = s.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không mở được buổi điểm danh." };
  }

  revalidateAttendance(classId);
  redirect(`/${role}/classes/${classId}/attendance/${sessionId}`);
}

export async function markSessionAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const sessionId = String(form.get("sessionId") ?? "");
  const ctx = await requireClassRole(classId, STAFF);

  // Form gửi lên theo cặp status_<studentId> / note_<studentId>.
  const marks: { studentId: string; status: AttendanceStatus; note?: string }[] = [];
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("status_")) continue;
    const studentId = key.slice("status_".length);
    const status = String(value) as AttendanceStatus;
    if (!ATTENDANCE_STATUSES.includes(status)) continue;
    marks.push({
      studentId,
      status,
      note: String(form.get(`note_${studentId}`) ?? ""),
    });
  }

  if (marks.length === 0) return { error: "Chưa có học sinh nào để điểm danh." };

  let n = 0;
  try {
    n = await markSession(ctx, sessionId, marks);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không lưu được điểm danh." };
  }

  revalidateAttendance(classId);
  return { ok: `Đã lưu điểm danh cho ${n} học sinh.` };
}

export async function deleteSessionAction(form: FormData): Promise<void> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, TEACHER_ONLY);

  await deleteSession(ctx, String(form.get("sessionId") ?? ""));
  revalidateAttendance(classId);
  redirect(`/teacher/classes/${classId}/attendance`);
}
