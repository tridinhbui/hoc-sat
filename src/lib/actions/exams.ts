"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireClassRole } from "@/lib/auth/guard";
import { ANY_MEMBER, TEACHER_ONLY } from "@/lib/auth/policy";
import {
  createExam,
  deleteExam,
  enterExam,
  logProctorEvent,
  saveExamAnswer,
  setReleased,
  startModule,
  submitModule,
  voidAttempt,
} from "@/lib/repo/exams";
import { EXAM_KINDS, type ExamKind, type ProctorEventType } from "@/lib/exam/types";
import type { ActionState } from "./classes";

function revalidateExam(classId: string, examId?: string) {
  revalidatePath(`/teacher/classes/${classId}/exams`, "layout");
  revalidatePath(`/ta/classes/${classId}/exams`, "layout");
  revalidatePath(`/student/classes/${classId}/exams`, "layout");
  if (examId) revalidatePath(`/student/exams/${examId}`, "layout");
}

/** datetime-local gửi theo giờ người dùng; trung tâm chạy một múi giờ. */
function parseVn(raw: string): Date | null {
  const v = raw.trim();
  if (!v) return null;
  const d = new Date(`${v}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ------------------------------ Soạn đề thi ------------------------------ */

export async function createExamAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, TEACHER_ONLY);

  const openAt = parseVn(String(form.get("openAt") ?? ""));
  const closeAt = parseVn(String(form.get("closeAt") ?? ""));
  if (!openAt || !closeAt) return { error: "Chọn giờ mở và giờ đóng ca thi." };

  const kind = String(form.get("kind") ?? "midterm") as ExamKind;
  if (!EXAM_KINDS.includes(kind)) return { error: "Loại kỳ thi không hợp lệ." };

  // Mỗi module là một dòng "rw" hoặc "math" theo đúng thứ tự làm bài.
  const modules = form
    .getAll("modules")
    .map(String)
    .filter((m): m is "rw" | "math" => m === "rw" || m === "math")
    .map((subject) => ({ subject }));

  let examId: string;
  try {
    examId = await createExam(ctx, {
      title: String(form.get("title") ?? ""),
      kind,
      openAt,
      closeAt,
      lockdown: form.get("lockdown") === "on",
      violationLimit: Number(form.get("violationLimit") ?? 3),
      modules,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không tạo được đề thi." };
  }

  revalidateExam(classId);
  redirect(`/teacher/classes/${classId}/exams/${examId}`);
}

export async function deleteExamAction(form: FormData): Promise<void> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, TEACHER_ONLY);
  await deleteExam(ctx, String(form.get("examId") ?? ""));
  revalidateExam(classId);
  redirect(`/teacher/classes/${classId}/exams`);
}

export async function setReleasedAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const examId = String(form.get("examId") ?? "");
  const ctx = await requireClassRole(classId, TEACHER_ONLY);

  const released = form.get("released") === "true";
  await setReleased(ctx, examId, released);
  revalidateExam(classId, examId);
  return { ok: released ? "Đã cho học sinh xem kết quả." : "Đã ẩn kết quả." };
}

export async function voidAttemptAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, TEACHER_ONLY);

  try {
    await voidAttempt(ctx, String(form.get("attemptId") ?? ""));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không huỷ được lượt thi." };
  }
  revalidateExam(classId, String(form.get("examId") ?? ""));
  return { ok: "Đã huỷ lượt thi." };
}

/* ------------------------------ Phòng thi ------------------------------ */

export async function enterExamAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const examId = String(form.get("examId") ?? "");
  const ctx = await requireClassRole(classId, ANY_MEMBER);

  try {
    await enterExam(ctx, examId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không vào phòng thi được." };
  }
  redirect(`/exam/${examId}`);
}

export async function startModuleAction(input: {
  classId: string;
  attemptId: string;
  moduleId: string;
}): Promise<{ ok: boolean; expiresAt?: number; error?: string }> {
  const ctx = await requireClassRole(input.classId, ANY_MEMBER);
  try {
    const ma = await startModule(ctx, input.attemptId, input.moduleId);
    return { ok: true, expiresAt: ma.expiresAt?.getTime() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Không bắt đầu được." };
  }
}

export async function saveExamAnswerAction(input: {
  classId: string;
  attemptId: string;
  moduleId: string;
  questionId: string;
  response: string | null;
  flagged?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireClassRole(input.classId, ANY_MEMBER);
  try {
    await saveExamAnswer(ctx, input);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Không lưu được." };
  }
}

export async function submitModuleAction(input: {
  classId: string;
  attemptId: string;
  moduleId: string;
}): Promise<{ ok: boolean; done?: boolean; nextModuleId?: string; error?: string }> {
  const ctx = await requireClassRole(input.classId, ANY_MEMBER);
  try {
    const res = await submitModule(ctx, input.attemptId, input.moduleId);
    revalidatePath(`/student/exams`, "layout");
    return { ok: true, done: res.done, nextModuleId: "nextModuleId" in res ? res.nextModuleId : undefined };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Không nộp được." };
  }
}

/**
 * Ghi sự kiện giám sát. Gọi ngay khi xảy ra chứ không gom lô —
 * mất mạng giữa chừng thì vẫn còn dấu vết những gì đã kịp gửi.
 */
export async function logProctorAction(input: {
  classId: string;
  attemptId: string;
  type: ProctorEventType;
  meta?: Record<string, unknown>;
}): Promise<{ violationCount: number; exceeded: boolean; limit: number }> {
  const ctx = await requireClassRole(input.classId, ANY_MEMBER);
  return logProctorEvent(ctx, input.attemptId, input.type, input.meta);
}
