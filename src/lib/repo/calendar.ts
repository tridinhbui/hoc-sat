import "server-only";
import { and, asc, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import { assignments, calendarEvents, classes, classMembers, exams } from "@/db/schema";
import type { AuthContext, ClassContext } from "@/lib/auth/guard";
import { ForbiddenError, canSetCalendar } from "@/lib/auth/policy";
import { vnDateKey } from "@/lib/utils/date";
import { EVENT_TYPES, type EventType, type FeedItem } from "@/lib/calendar/types";

export { EVENT_TYPES };
export type { EventType, FeedItem };

/* ------------------------------------------------------------------ *
 * Calendar.
 *
 * Hạn nộp bài và lịch thi KHÔNG được nhập tay lần thứ hai — chúng sinh
 * thẳng từ `assignments.due_at` và `exams.open_at`. Bắt giáo viên nhập
 * hai chỗ thì sớm muộn hai chỗ cũng lệch nhau.
 *
 * `calendar_events` chỉ dùng cho những gì không suy ra được từ dữ liệu
 * khác: buổi học, buổi bù, thông báo nghỉ.
 * ------------------------------------------------------------------ */

type ClassInfo = { id: string; name: string; subject: "rw" | "math" };

/** Lớp mà user có quyền xem lịch. Admin thấy tất cả. */
async function visibleClasses(ctx: AuthContext): Promise<Map<string, ClassInfo>> {
  const rows =
    ctx.user.role === "admin"
      ? await ctx.db
          .select({ id: classes.id, name: classes.name, subject: classes.subject })
          .from(classes)
      : await ctx.db
          .select({ id: classes.id, name: classes.name, subject: classes.subject })
          .from(classMembers)
          .innerJoin(classes, eq(classes.id, classMembers.classId))
          .where(eq(classMembers.userId, ctx.user.id));

  return new Map(rows.map((c) => [c.id, c]));
}

export async function listMyClassOptions(ctx: AuthContext): Promise<ClassInfo[]> {
  return [...(await visibleClasses(ctx)).values()].sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

/**
 * Toàn bộ mục hiển thị trên lịch trong khoảng [from, to].
 *
 * Học sinh chỉ thấy bài tập ĐÃ GIAO — bài nháp không được lộ qua đường lịch.
 */
export async function getCalendarFeed(
  ctx: AuthContext,
  range: { from: Date; to: Date; classId?: string },
): Promise<FeedItem[]> {
  const byId = await visibleClasses(ctx);
  if (byId.size === 0) return [];

  const ids = range.classId
    ? byId.has(range.classId)
      ? [range.classId]
      : [] // xin lịch lớp không thuộc về mình thì trả rỗng, không báo lỗi
    : [...byId.keys()];
  if (ids.length === 0) return [];

  const from = range.from;
  const to = range.to;
  // Cần biết vai trò TRONG TỪNG LỚP: link phải trỏ đúng nhánh /teacher,
  // /ta hay /student, và bài nháp chỉ nhân sự của chính lớp đó mới thấy.
  const myRoles = new Map(
    (
      await ctx.db
        .select({ classId: classMembers.classId, role: classMembers.role })
        .from(classMembers)
        .where(eq(classMembers.userId, ctx.user.id))
    ).map((r) => [r.classId, r.role]),
  );
  const isAdmin = ctx.user.role === "admin";

  const roleIn = (classId: string) =>
    isAdmin ? ("teacher" as const) : (myRoles.get(classId) ?? "student");
  const isStaffIn = (classId: string) => {
    const r = roleIn(classId);
    return r === "teacher" || r === "ta";
  };

  const [events, dues, examRows] = await Promise.all([
    ctx.db
      .select()
      .from(calendarEvents)
      .where(
        and(
          inArray(calendarEvents.classId, ids),
          gte(calendarEvents.startAt, from),
          lte(calendarEvents.startAt, to),
        ),
      )
      .orderBy(asc(calendarEvents.startAt)),

    ctx.db
      .select({
        id: assignments.id,
        classId: assignments.classId,
        title: assignments.title,
        dueAt: assignments.dueAt,
        publishedAt: assignments.publishedAt,
      })
      .from(assignments)
      .where(
        and(
          inArray(assignments.classId, ids),
          isNotNull(assignments.dueAt),
          gte(assignments.dueAt, from),
          lte(assignments.dueAt, to),
        ),
      ),

    ctx.db
      .select({
        id: exams.id,
        classId: exams.classId,
        title: exams.title,
        kind: exams.kind,
        openAt: exams.openAt,
        closeAt: exams.closeAt,
      })
      .from(exams)
      .where(
        and(inArray(exams.classId, ids), gte(exams.openAt, from), lte(exams.openAt, to)),
      ),
  ]);

  const out: FeedItem[] = [];

  for (const e of events) {
    const c = byId.get(e.classId)!;
    out.push({
      id: e.id,
      source: "event",
      type: e.type,
      title: e.title,
      startAt: e.startAt.getTime(),
      endAt: e.endAt?.getTime() ?? null,
      allDay: e.allDay,
      classId: e.classId,
      className: c.name,
      subject: c.subject,
      dateKey: vnDateKey(e.startAt),
      href: null,
    });
  }

  for (const a of dues) {
    // Bài nháp chỉ giáo viên và TA của chính lớp đó thấy.
    if (!a.publishedAt && !isStaffIn(a.classId)) continue;

    const c = byId.get(a.classId)!;
    const role = roleIn(a.classId);
    out.push({
      id: `assignment:${a.id}`,
      source: "assignment",
      type: "deadline",
      title: a.publishedAt ? a.title : `${a.title} (nháp)`,
      startAt: a.dueAt!.getTime(),
      endAt: null,
      allDay: false,
      classId: a.classId,
      className: c.name,
      subject: c.subject,
      dateKey: vnDateKey(a.dueAt!),
      href: `/${role}/classes/${a.classId}/assignments/${a.id}`,
    });
  }

  for (const x of examRows) {
    const c = byId.get(x.classId)!;
    const role = roleIn(x.classId);
    out.push({
      id: `exam:${x.id}`,
      source: "exam",
      type: x.kind === "midterm" ? "midterm" : x.kind === "final" ? "final" : "other",
      title: x.title,
      startAt: x.openAt.getTime(),
      endAt: x.closeAt.getTime(),
      allDay: false,
      classId: x.classId,
      className: c.name,
      subject: c.subject,
      dateKey: vnDateKey(x.openAt),
      href:
        role === "student"
          ? `/student/exams/${x.id}`
          : `/${role}/classes/${x.classId}/exams/${x.id}`,
    });
  }

  return out.sort((a, b) => a.startAt - b.startAt);
}

/* ------------------------- Ghi (teacher-only) ------------------------- */

function assertCanWrite(ctx: ClassContext) {
  // TA và học sinh chỉ xem. PLAN.md §4.
  if (!canSetCalendar(ctx.classRole)) {
    throw new ForbiddenError("Chỉ giáo viên được đặt lịch.");
  }
}

export async function createEvent(
  ctx: ClassContext,
  input: {
    title: string;
    description?: string;
    type: EventType;
    startAt: Date;
    endAt?: Date | null;
    allDay: boolean;
  },
) {
  assertCanWrite(ctx);

  const title = input.title.trim();
  if (!title) throw new Error("Sự kiện cần có tiêu đề.");
  if (!EVENT_TYPES.includes(input.type)) throw new Error("Loại sự kiện không hợp lệ.");
  if (input.endAt && input.endAt < input.startAt) {
    throw new Error("Giờ kết thúc phải sau giờ bắt đầu.");
  }

  const id = crypto.randomUUID();
  await ctx.db.insert(calendarEvents).values({
    id,
    classId: ctx.classId,
    title,
    description: input.description?.trim() || null,
    type: input.type,
    startAt: input.startAt,
    endAt: input.endAt ?? null,
    allDay: input.allDay,
    createdBy: ctx.user.id,
  });
  return id;
}

export async function deleteEvent(ctx: ClassContext, eventId: string) {
  assertCanWrite(ctx);

  const row = await ctx.db.query.calendarEvents.findFirst({
    where: and(eq(calendarEvents.id, eventId), eq(calendarEvents.classId, ctx.classId)),
  });
  if (!row) throw new ForbiddenError("Sự kiện không tồn tại trong lớp này.");

  await ctx.db.delete(calendarEvents).where(eq(calendarEvents.id, eventId));
}

/** Lớp mà user là GIÁO VIÊN — chỉ những lớp này mới thêm/xoá được mục lịch. */
export async function listClassesIManage(ctx: AuthContext): Promise<Set<string>> {
  if (ctx.user.role === "admin") {
    return new Set((await visibleClasses(ctx)).keys());
  }
  const rows = await ctx.db
    .select({ classId: classMembers.classId })
    .from(classMembers)
    .where(and(eq(classMembers.userId, ctx.user.id), eq(classMembers.role, "teacher")));
  return new Set(rows.map((r) => r.classId));
}
