import "server-only";
import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import {
  assignments,
  attendanceSessions,
  classMembers,
  classes,
  examAttempts,
  submissions,
} from "@/db/schema";
import type { AuthContext } from "@/lib/auth/guard";
import { vnDateKey } from "@/lib/utils/date";

/* ------------------------------------------------------------------ *
 * Số liệu cho trang chủ.
 *
 * Mọi con số ở đây phải đọc từ dữ liệu thật. Ô chỉ số hiển thị hằng số
 * còn tệ hơn là không có ô nào: học sinh nộp bài đều đặn mà vẫn thấy
 * "0 ngày" thì lần sau không ai nhìn dashboard nữa.
 * ------------------------------------------------------------------ */

/** Ngày (giờ VN) mà học sinh có hoạt động: nộp bài hoặc nộp bài thi. */
async function activeDays(ctx: AuthContext, sinceDays = 120): Promise<Set<string>> {
  const since = new Date(Date.now() - sinceDays * 86_400_000);

  const [subs, exams] = await Promise.all([
    ctx.db
      .select({ at: submissions.turnedInAt })
      .from(submissions)
      .where(
        and(
          eq(submissions.studentId, ctx.user.id),
          isNotNull(submissions.turnedInAt),
          gte(submissions.turnedInAt, since),
        ),
      ),
    ctx.db
      .select({ at: examAttempts.submittedAt })
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.studentId, ctx.user.id),
          isNotNull(examAttempts.submittedAt),
          gte(examAttempts.submittedAt, since),
        ),
      ),
  ]);

  const days = new Set<string>();
  for (const r of [...subs, ...exams]) if (r.at) days.add(vnDateKey(r.at));
  return days;
}

/**
 * Số ngày hoạt động liên tiếp tính tới hôm nay.
 *
 * Hôm nay chưa làm gì thì chuỗi vẫn tính từ hôm qua: streak chỉ nên đứt khi
 * đã bỏ trọn một ngày, không phải vì mới 8 giờ sáng.
 */
export async function studentStreak(ctx: AuthContext): Promise<number> {
  const days = await activeDays(ctx);
  if (days.size === 0) return 0;

  const today = new Date();
  let cursor = days.has(vnDateKey(today))
    ? today
    : new Date(today.getTime() - 86_400_000);

  let streak = 0;
  while (days.has(vnDateKey(cursor))) {
    streak++;
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return streak;
}

export type RecentGrade = {
  assignmentId: string;
  classId: string;
  className: string;
  title: string;
  grade: number;
  points: number;
  returnedAt: Date;
};

/** Điểm mới được trả, gộp mọi lớp — bảng điểm theo lớp nằm trong từng lớp. */
export async function recentGrades(ctx: AuthContext, limit = 5): Promise<RecentGrade[]> {
  const rows = await ctx.db
    .select({
      assignmentId: assignments.id,
      classId: assignments.classId,
      className: classes.name,
      title: assignments.title,
      grade: submissions.finalGrade,
      points: assignments.points,
      returnedAt: submissions.returnedAt,
    })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .innerJoin(classes, eq(classes.id, assignments.classId))
    .where(
      and(
        eq(submissions.studentId, ctx.user.id),
        eq(submissions.status, "returned"),
        isNotNull(submissions.finalGrade),
      ),
    )
    .orderBy(desc(submissions.returnedAt))
    .limit(limit);

  return rows.filter(
    (r): r is RecentGrade => r.grade !== null && r.returnedAt !== null,
  );
}

/** Điểm trung bình trên thang 100 của mọi bài đã được trả. */
export async function myAverage(ctx: AuthContext): Promise<number | null> {
  const [row] = await ctx.db
    .select({
      earned: sql<number>`sum(${submissions.finalGrade})`,
      max: sql<number>`sum(${assignments.points})`,
    })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .where(
      and(
        eq(submissions.studentId, ctx.user.id),
        eq(submissions.status, "returned"),
        isNotNull(submissions.finalGrade),
      ),
    );

  const earned = Number(row?.earned);
  const max = Number(row?.max);
  if (!Number.isFinite(earned) || !Number.isFinite(max) || max <= 0) return null;
  return Math.round((earned / max) * 100);
}

/** Lớp mà giáo viên/TA phụ trách và HÔM NAY chưa mở buổi điểm danh nào. */
export async function classesNeedingAttendance(
  ctx: AuthContext,
): Promise<{ id: string; name: string }[]> {
  const mine = await ctx.db
    .select({ id: classes.id, name: classes.name })
    .from(classMembers)
    .innerJoin(classes, eq(classes.id, classMembers.classId))
    .where(
      and(
        eq(classMembers.userId, ctx.user.id),
        inArray(classMembers.role, ["teacher", "ta"]),
        eq(classes.archived, false),
      ),
    );
  if (mine.length === 0) return [];

  const today = vnDateKey();
  const done = await ctx.db
    .select({ classId: attendanceSessions.classId })
    .from(attendanceSessions)
    .where(
      and(
        inArray(attendanceSessions.classId, mine.map((c) => c.id)),
        eq(attendanceSessions.sessionDate, today),
      ),
    );

  const marked = new Set(done.map((d) => d.classId));
  return mine.filter((c) => !marked.has(c.id));
}
