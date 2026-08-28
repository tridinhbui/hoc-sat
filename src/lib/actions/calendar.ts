"use server";

import { revalidatePath } from "next/cache";
import { requireClassRole } from "@/lib/auth/guard";
import { TEACHER_ONLY } from "@/lib/auth/policy";
import { createEvent, deleteEvent } from "@/lib/repo/calendar";
import { EVENT_TYPES, type EventType } from "@/lib/calendar/types";
import type { ActionState } from "./classes";

/**
 * Ô datetime-local gửi lên theo giờ NGƯỜI DÙNG. Trung tâm chạy một múi giờ
 * duy nhất nên quy đổi thẳng từ +07:00, không phụ thuộc múi giờ máy chủ.
 */
function parseVnDateTime(raw: string, allDay: boolean): Date | null {
  const v = raw.trim();
  if (!v) return null;
  const iso = allDay ? `${v}T00:00:00+07:00` : `${v}:00+07:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createEventAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  if (!classId) return { error: "Chọn lớp cho sự kiện này." };

  const ctx = await requireClassRole(classId, TEACHER_ONLY);

  const allDay = form.get("allDay") === "on";
  const startAt = parseVnDateTime(String(form.get("startAt") ?? ""), allDay);
  if (!startAt) return { error: "Chọn thời gian bắt đầu." };

  const type = String(form.get("type") ?? "class") as EventType;
  if (!EVENT_TYPES.includes(type)) return { error: "Loại sự kiện không hợp lệ." };

  try {
    await createEvent(ctx, {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      type,
      startAt,
      endAt: parseVnDateTime(String(form.get("endAt") ?? ""), allDay),
      allDay,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không tạo được sự kiện." };
  }

  revalidatePath("/calendar");
  return { ok: "Đã thêm vào lịch." };
}

export async function deleteEventAction(form: FormData): Promise<void> {
  const classId = String(form.get("classId") ?? "");
  const ctx = await requireClassRole(classId, TEACHER_ONLY);

  await deleteEvent(ctx, String(form.get("eventId") ?? ""));
  revalidatePath("/calendar");
}
