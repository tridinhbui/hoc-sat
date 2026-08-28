import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { assignments, classMembers, classes, submissions, user } from "@/db/schema";
import type { ClassContext } from "@/lib/auth/guard";

/* ------------------------------------------------------------------ *
 * Dữ liệu người nhận cho email.
 *
 * Nằm trong repo layer vì nó vẫn là truy vấn DB — tầng email chỉ dựng
 * nội dung và gửi, không được tự chạm vào bảng nào.
 * ------------------------------------------------------------------ */

export type AssignmentTargets = {
  className: string;
  title: string;
  dueAt: Date | null;
  published: boolean;
  students: { id: string; name: string; email: string }[];
};

/** Người nhận thông báo "có bài tập mới" — chỉ học sinh còn hoạt động. */
export async function assignmentTargets(
  ctx: ClassContext,
  assignmentId: string,
): Promise<AssignmentTargets | null> {
  const a = await ctx.db.query.assignments.findFirst({
    where: and(eq(assignments.id, assignmentId), eq(assignments.classId, ctx.classId)),
  });
  if (!a) return null;

  const klass = await ctx.db.query.classes.findFirst({ where: eq(classes.id, ctx.classId) });

  const students = await ctx.db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(classMembers)
    .innerJoin(user, eq(user.id, classMembers.userId))
    .where(
      and(
        eq(classMembers.classId, ctx.classId),
        eq(classMembers.role, "student"),
        // Tài khoản đã khoá thì không gửi nữa.
        eq(user.active, true),
      ),
    );

  return {
    className: klass?.name ?? "lớp của bạn",
    title: a.title,
    dueAt: a.dueAt,
    published: !!a.publishedAt,
    students,
  };
}

export type ReturnedTarget = {
  studentName: string;
  studentEmail: string;
  className: string;
  assignmentId: string;
  title: string;
  points: number;
  grade: number | null;
  feedback: string | null;
};

/** Người nhận thông báo "đã trả bài" — chỉ những bài thực sự ở trạng thái returned. */
export async function returnedTargets(
  ctx: ClassContext,
  submissionIds: string[],
): Promise<ReturnedTarget[]> {
  if (submissionIds.length === 0) return [];

  const klass = await ctx.db.query.classes.findFirst({ where: eq(classes.id, ctx.classId) });

  const rows = await ctx.db
    .select({
      studentName: user.name,
      studentEmail: user.email,
      assignmentId: assignments.id,
      title: assignments.title,
      points: assignments.points,
      grade: submissions.finalGrade,
      feedback: submissions.feedback,
    })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .innerJoin(user, eq(user.id, submissions.studentId))
    .where(
      and(
        inArray(submissions.id, submissionIds),
        eq(assignments.classId, ctx.classId),
        eq(submissions.status, "returned"),
        eq(user.active, true),
      ),
    );

  return rows.map((r) => ({ ...r, className: klass?.name ?? "lớp của bạn" }));
}
