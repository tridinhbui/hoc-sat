import "server-only";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import {
  ATTENDANCE_STATUS,
  attendanceRecords,
  attendanceSessions,
  classMembers,
  user,
} from "@/db/schema";
import type { AuthContext, ClassContext } from "@/lib/auth/guard";
import { ForbiddenError, canTakeAttendance } from "@/lib/auth/policy";
import { vnDateKey } from "@/lib/utils/date";
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
  type RosterRow,
  type SessionSummary,
  type StudentAttendance,
} from "@/lib/attendance/types";

export { ATTENDANCE_STATUSES };
export type { AttendanceStatus, RosterRow, SessionSummary, StudentAttendance };

/* ------------------------------------------------------------------ *
 * Điểm danh.
 *
 * `session_date` lưu dạng text "YYYY-MM-DD" theo GIỜ VIỆT NAM, không phải
 * timestamp. Buổi học là một khái niệm theo ngày lịch: lưu timestamp rồi
 * đổi múi giờ sẽ có ngày nhảy sang hôm trước với lớp học buổi tối.
 * ------------------------------------------------------------------ */

// Danh sách trạng thái lệch với CHECK trong schema thì gãy ở typecheck,
// không phải lúc chạy.
const _statusMatchesSchema: readonly AttendanceStatus[] = ATTENDANCE_STATUS;
void _statusMatchesSchema;

function assertCanMark(ctx: ClassContext) {
  if (!canTakeAttendance(ctx.classRole)) {
    throw new ForbiddenError("Điểm danh là việc của giáo viên và trợ giảng.");
  }
}

/* ------------------------------ Buổi học ------------------------------ */

export async function listSessions(ctx: ClassContext, limit = 60): Promise<SessionSummary[]> {
  assertCanMark(ctx);

  const sessions = await ctx.db.query.attendanceSessions.findMany({
    where: eq(attendanceSessions.classId, ctx.classId),
    orderBy: [desc(attendanceSessions.sessionDate)],
    limit,
  });
  if (sessions.length === 0) return [];

  const rows = await ctx.db
    .select({
      sessionId: attendanceRecords.sessionId,
      status: attendanceRecords.status,
      n: count(),
    })
    .from(attendanceRecords)
    .where(inArray(attendanceRecords.sessionId, sessions.map((s) => s.id)))
    .groupBy(attendanceRecords.sessionId, attendanceRecords.status);

  return sessions.map((s) => {
    const mine = rows.filter((r) => r.sessionId === s.id);
    const get = (st: AttendanceStatus) => mine.find((r) => r.status === st)?.n ?? 0;
    return {
      id: s.id,
      sessionDate: s.sessionDate,
      title: s.title,
      present: get("present"),
      absent: get("absent"),
      late: get("late"),
      excused: get("excused"),
      marked: mine.reduce((a, r) => a + r.n, 0),
    };
  });
}

/**
 * Mở buổi điểm danh của một ngày. Gọi nhiều lần cùng ngày vẫn ra một buổi —
 * nút "Điểm danh hôm nay" bấm mấy lần cũng không sinh buổi trùng.
 */
export async function openSession(ctx: ClassContext, date?: string, title?: string) {
  assertCanMark(ctx);
  const sessionDate = date?.trim() || vnDateKey();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    throw new Error("Ngày không hợp lệ.");
  }

  const existing = await ctx.db.query.attendanceSessions.findFirst({
    where: and(
      eq(attendanceSessions.classId, ctx.classId),
      eq(attendanceSessions.sessionDate, sessionDate),
    ),
  });
  if (existing) return existing;

  const id = crypto.randomUUID();
  await ctx.db.insert(attendanceSessions).values({
    id,
    classId: ctx.classId,
    sessionDate,
    title: title?.trim() || null,
    createdBy: ctx.user.id,
  });
  return (await ctx.db.query.attendanceSessions.findFirst({
    where: eq(attendanceSessions.id, id),
  }))!;
}

async function loadSessionInClass(ctx: ClassContext, sessionId: string) {
  const s = await ctx.db.query.attendanceSessions.findFirst({
    where: and(
      eq(attendanceSessions.id, sessionId),
      eq(attendanceSessions.classId, ctx.classId),
    ),
  });
  if (!s) throw new ForbiddenError("Buổi điểm danh không tồn tại trong lớp này.");
  return s;
}

/** Danh sách điểm danh của một buổi: cả lớp, kèm trạng thái đã đánh (nếu có). */
export async function getSessionSheet(ctx: ClassContext, sessionId: string) {
  assertCanMark(ctx);
  const session = await loadSessionInClass(ctx, sessionId);

  const roster = await ctx.db
    .select({
      studentId: user.id,
      name: user.name,
      email: user.email,
      status: attendanceRecords.status,
      note: attendanceRecords.note,
    })
    .from(classMembers)
    .innerJoin(user, eq(user.id, classMembers.userId))
    .leftJoin(
      attendanceRecords,
      and(
        eq(attendanceRecords.studentId, user.id),
        eq(attendanceRecords.sessionId, sessionId),
      ),
    )
    .where(and(eq(classMembers.classId, ctx.classId), eq(classMembers.role, "student")))
    .orderBy(asc(user.name));

  return { session, roster: roster as RosterRow[] };
}

/**
 * Ghi điểm danh cho cả buổi. Ghi đè trạng thái cũ, nên đây cũng là đường
 * để sửa lại lịch sử — giáo viên chỉ cần mở buổi cũ và lưu lại.
 */
export async function markSession(
  ctx: ClassContext,
  sessionId: string,
  marks: { studentId: string; status: AttendanceStatus; note?: string }[],
) {
  assertCanMark(ctx);
  await loadSessionInClass(ctx, sessionId);

  // Chỉ nhận học sinh thật sự trong lớp — không cho ghi điểm danh cho
  // người ngoài bằng cách sửa id trong form.
  const members = await ctx.db
    .select({ userId: classMembers.userId })
    .from(classMembers)
    .where(and(eq(classMembers.classId, ctx.classId), eq(classMembers.role, "student")));
  const allowed = new Set(members.map((m) => m.userId));

  const valid = marks.filter(
    (m) => allowed.has(m.studentId) && ATTENDANCE_STATUSES.includes(m.status),
  );
  if (valid.length === 0) return 0;

  const now = new Date();
  const statements = valid.map((m) =>
    ctx.db
      .insert(attendanceRecords)
      .values({
        id: crypto.randomUUID(),
        sessionId,
        studentId: m.studentId,
        status: m.status,
        note: m.note?.trim() || null,
        markedBy: ctx.user.id,
        markedAt: now,
      })
      .onConflictDoUpdate({
        target: [attendanceRecords.sessionId, attendanceRecords.studentId],
        set: {
          status: m.status,
          note: m.note?.trim() || null,
          markedBy: ctx.user.id,
          markedAt: now,
        },
      }),
  );

  await ctx.db.batch(statements as [(typeof statements)[number], ...typeof statements]);
  return valid.length;
}

export async function deleteSession(ctx: ClassContext, sessionId: string) {
  if (ctx.classRole !== "teacher") {
    throw new ForbiddenError("Chỉ giáo viên được xoá buổi điểm danh.");
  }
  await loadSessionInClass(ctx, sessionId);
  await ctx.db.delete(attendanceSessions).where(eq(attendanceSessions.id, sessionId));
}

/* ---------------------------- Thống kê chuyên cần ---------------------------- */

export async function attendanceSummary(ctx: ClassContext): Promise<StudentAttendance[]> {
  assertCanMark(ctx);

  const rows = await ctx.db
    .select({
      studentId: user.id,
      name: user.name,
      status: attendanceRecords.status,
      n: count(),
    })
    .from(classMembers)
    .innerJoin(user, eq(user.id, classMembers.userId))
    .leftJoin(
      attendanceRecords,
      eq(attendanceRecords.studentId, user.id),
    )
    .leftJoin(
      attendanceSessions,
      and(
        eq(attendanceSessions.id, attendanceRecords.sessionId),
        eq(attendanceSessions.classId, ctx.classId),
      ),
    )
    .where(
      and(
        eq(classMembers.classId, ctx.classId),
        eq(classMembers.role, "student"),
        // Chỉ đếm bản ghi thuộc lớp này; học sinh học nhiều lớp thì
        // chuyên cần của lớp khác không được lẫn vào.
        sql`(${attendanceRecords.id} IS NULL OR ${attendanceSessions.id} IS NOT NULL)`,
      ),
    )
    .groupBy(user.id, attendanceRecords.status);

  const by = new Map<string, StudentAttendance>();
  for (const r of rows) {
    const cur =
      by.get(r.studentId) ??
      ({
        studentId: r.studentId,
        name: r.name,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        total: 0,
        rate: null,
      } satisfies StudentAttendance);

    if (r.status) {
      cur[r.status as AttendanceStatus] += r.n;
      cur.total += r.n;
    }
    by.set(r.studentId, cur);
  }

  return [...by.values()]
    .map((s) => ({
      ...s,
      // Buổi có phép không tính vào mẫu số: nghỉ có phép không phải là lỗi
      // chuyên cần, nhưng cũng không tính là có mặt.
      rate:
        s.total - s.excused > 0
          ? Math.round(((s.present + s.late) / (s.total - s.excused)) * 100)
          : null,
    }))
    .sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101));
}

/** Lịch sử điểm danh của chính học sinh trong lớp này. */
export async function myAttendance(ctx: ClassContext) {
  const rows = await ctx.db
    .select({
      sessionDate: attendanceSessions.sessionDate,
      title: attendanceSessions.title,
      status: attendanceRecords.status,
      note: attendanceRecords.note,
    })
    .from(attendanceRecords)
    .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceRecords.sessionId))
    .where(
      and(
        eq(attendanceSessions.classId, ctx.classId),
        eq(attendanceRecords.studentId, ctx.user.id),
      ),
    )
    .orderBy(desc(attendanceSessions.sessionDate));

  const total = rows.length;
  const excused = rows.filter((r) => r.status === "excused").length;
  const attended = rows.filter((r) => r.status === "present" || r.status === "late").length;

  return {
    rows,
    total,
    attended,
    absent: rows.filter((r) => r.status === "absent").length,
    rate: total - excused > 0 ? Math.round((attended / (total - excused)) * 100) : null,
  };
}

/* --------------------- Số liệu cho dashboard TA --------------------- */

/**
 * Lớp nào hôm nay chưa điểm danh — để shortcut trên dashboard TA nói được
 * "còn phải làm" chứ không chỉ là một cái nút chung chung.
 */
export async function markedTodayByClass(ctx: AuthContext): Promise<Set<string>> {
  const today = vnDateKey();

  const rows = await ctx.db
    .select({ classId: attendanceSessions.classId })
    .from(attendanceSessions)
    .innerJoin(attendanceRecords, eq(attendanceRecords.sessionId, attendanceSessions.id))
    .innerJoin(classMembers, eq(classMembers.classId, attendanceSessions.classId))
    .where(
      and(
        eq(classMembers.userId, ctx.user.id),
        inArray(classMembers.role, ["teacher", "ta"]),
        eq(attendanceSessions.sessionDate, today),
      ),
    )
    .groupBy(attendanceSessions.classId);

  return new Set(rows.map((r) => r.classId));
}
