import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { classes, classMembers, submissions, type ClassRole, type Role } from "@/db/schema";

/* ------------------------------------------------------------------ *
 * LUẬT PHÂN QUYỀN — thuần, không dính Next/session/cookie.
 *
 * Tách khỏi guard.ts để test được trên D1 thật. D1 không có RLS, nên
 * "ai được làm gì trong lớp" chỉ được định nghĩa ở đúng file này.
 * ------------------------------------------------------------------ */

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "Bạn không có quyền truy cập mục này.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type Actor = { id: string; role: Role };

export const TEACHER_ONLY = ["teacher"] as const;
export const STAFF = ["teacher", "ta"] as const;
export const ANY_MEMBER = ["teacher", "ta", "student"] as const;

/**
 * Thành viên của lớp VÀ có quyền phù hợp trong lớp đó.
 * Trả về quyền TRONG LỚP — admin luôn được coi là 'teacher'.
 */
export async function assertClassAccess(
  db: Db,
  actor: Actor,
  classId: string,
  allowed: readonly ClassRole[],
): Promise<{ classRole: ClassRole; klass: typeof classes.$inferSelect }> {
  // Cùng một thông báo cho "lớp không tồn tại" và "không phải thành viên",
  // để người ngoài không dò được lớp nào có thật.
  const opaque = () => new ForbiddenError("Lớp không tồn tại hoặc bạn không có quyền xem.");

  const klass = await db.query.classes.findFirst({ where: eq(classes.id, classId) });
  if (!klass) throw opaque();

  if (actor.role === "admin") return { classRole: "teacher", klass };

  const membership = await db.query.classMembers.findFirst({
    where: and(eq(classMembers.classId, classId), eq(classMembers.userId, actor.id)),
  });
  if (!membership) throw opaque();

  if (!allowed.includes(membership.role)) {
    throw new ForbiddenError("Bạn không có quyền thực hiện thao tác này trong lớp.");
  }
  return { classRole: membership.role, klass };
}

/** Học sinh chỉ được chạm vào bài nộp của chính mình. */
export async function assertOwnSubmission(db: Db, actorId: string, submissionId: string) {
  const sub = await db.query.submissions.findFirst({ where: eq(submissions.id, submissionId) });
  if (!sub) throw new ForbiddenError("Bài nộp không tồn tại.");
  if (sub.studentId !== actorId) throw new ForbiddenError("Đây không phải bài nộp của bạn.");
  return sub;
}

/* --------------------------- tiện ích cho UI --------------------------- */
/** TA KHÔNG có: cài đặt lớp, quản lý roster, set lịch, tạo đề thi. */
export const canManageClass = (r: ClassRole) => r === "teacher";
export const canGrade = (r: ClassRole) => r === "teacher" || r === "ta";
export const canPost = (r: ClassRole) => r === "teacher" || r === "ta";
export const canTakeAttendance = (r: ClassRole) => r === "teacher" || r === "ta";
export const canSetCalendar = (r: ClassRole) => r === "teacher";
export const canCreateExam = (r: ClassRole) => r === "teacher";
