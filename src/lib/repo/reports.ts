import "server-only";
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import {
  assignments,
  classMembers,
  examAttempts,
  examModules,
  exams,
  questions,
  submissions,
  user,
} from "@/db/schema";
import type { ClassContext } from "@/lib/auth/guard";
import { ForbiddenError, canGrade } from "@/lib/auth/policy";
import type { StudentReport } from "@/lib/reports/types";
import { attendanceSummary } from "./attendance";

export type { StudentReport };

/* ------------------------------------------------------------------ *
 * Báo cáo tiến độ — gộp bài tập, thi và chuyên cần của cả lớp.
 *
 * Chỉ tính điểm ĐÃ CHỐT: bài tập phải `returned`, lượt thi phải
 * `submitted`/`auto_submitted`. Bài đang chấm dở mà lọt vào báo cáo thì
 * phụ huynh sẽ thấy một con số rồi tuần sau thấy con số khác, không giải
 * thích được.
 *
 * Bốn truy vấn riêng thay vì một câu JOIN hết: mỗi nguồn có mẫu số khác
 * nhau (bài tập theo điểm, thi theo tổng điểm câu hỏi, chuyên cần theo
 * buổi), gộp lại thì các LEFT JOIN nhân bản dòng của nhau.
 * ------------------------------------------------------------------ */

function assertStaff(ctx: ClassContext) {
  if (!canGrade(ctx.classRole)) {
    throw new ForbiddenError("Báo cáo dành cho giáo viên và trợ giảng.");
  }
}

/** Điểm tối đa mỗi kỳ thi = tổng điểm câu hỏi của mọi module. */
async function examMaxScores(ctx: ClassContext, examIds: string[]) {
  const out = new Map<string, number>();
  if (examIds.length === 0) return out;

  const rows = await ctx.db
    .select({ examId: examModules.examId, total: sql<number>`sum(${questions.points})` })
    .from(examModules)
    .innerJoin(questions, eq(questions.examModuleId, examModules.id))
    .where(inArray(examModules.examId, examIds))
    .groupBy(examModules.examId);

  for (const r of rows) out.set(r.examId, Number(r.total) || 0);
  return out;
}

export async function classReport(ctx: ClassContext): Promise<StudentReport[]> {
  assertStaff(ctx);

  const roster = await ctx.db
    .select({ studentId: user.id, name: user.name, email: user.email })
    .from(classMembers)
    .innerJoin(user, eq(user.id, classMembers.userId))
    .where(and(eq(classMembers.classId, ctx.classId), eq(classMembers.role, "student")))
    .orderBy(asc(user.name));

  const report = new Map<string, StudentReport>(
    roster.map((r) => [
      r.studentId,
      {
        ...r,
        assignmentsGraded: 0,
        assignmentsAssigned: 0,
        assignmentsTurnedIn: 0,
        assignmentsLate: 0,
        assignmentScore: null,
        assignmentMax: null,
        examsTaken: 0,
        examScore: null,
        examMax: null,
        attendanceRate: null,
        sessionsCounted: 0,
      },
    ]),
  );
  if (report.size === 0) return [];

  /* ------------------------------- Bài tập ------------------------------- */

  // Mẫu số là số bài ĐÃ PUBLISH, giống nhau cho mọi học sinh trong lớp.
  const published = await ctx.db
    .select({ n: sql<number>`count(*)` })
    .from(assignments)
    .where(and(eq(assignments.classId, ctx.classId), isNotNull(assignments.publishedAt)));
  const assignedCount = Number(published[0]?.n) || 0;

  const subs = await ctx.db
    .select({
      studentId: submissions.studentId,
      status: submissions.status,
      isLate: submissions.isLate,
      finalGrade: submissions.finalGrade,
      points: assignments.points,
    })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .where(
      and(eq(assignments.classId, ctx.classId), isNotNull(assignments.publishedAt)),
    );

  for (const s of subs) {
    const row = report.get(s.studentId);
    // Học sinh đã rời lớp vẫn còn bài nộp cũ — không thuộc báo cáo hiện tại.
    if (!row) continue;

    if (s.status === "turned_in" || s.status === "returned") {
      row.assignmentsTurnedIn++;
      if (s.isLate) row.assignmentsLate++;
    }
    if (s.status === "returned" && s.finalGrade !== null) {
      row.assignmentsGraded++;
      row.assignmentScore = (row.assignmentScore ?? 0) + s.finalGrade;
      row.assignmentMax = (row.assignmentMax ?? 0) + s.points;
    }
  }

  for (const row of report.values()) row.assignmentsAssigned = assignedCount;

  /* --------------------------------- Thi --------------------------------- */

  const classExams = await ctx.db
    .select({ id: exams.id })
    .from(exams)
    .where(eq(exams.classId, ctx.classId));
  const examIds = classExams.map((e) => e.id);

  if (examIds.length > 0) {
    const maxByExam = await examMaxScores(ctx, examIds);

    const attempts = await ctx.db
      .select({
        studentId: examAttempts.studentId,
        examId: examAttempts.examId,
        totalScore: examAttempts.totalScore,
      })
      .from(examAttempts)
      .where(
        and(
          inArray(examAttempts.examId, examIds),
          inArray(examAttempts.status, ["submitted", "auto_submitted"]),
        ),
      );

    for (const a of attempts) {
      const row = report.get(a.studentId);
      if (!row || a.totalScore === null) continue;

      // Đề chưa có câu hỏi nào thì mẫu số bằng 0 — bỏ qua, nếu không sẽ
      // ra tỉ lệ vô nghĩa.
      const max = maxByExam.get(a.examId) ?? 0;
      if (max <= 0) continue;

      row.examsTaken++;
      row.examScore = (row.examScore ?? 0) + a.totalScore;
      row.examMax = (row.examMax ?? 0) + max;
    }
  }

  /* ------------------------------ Chuyên cần ------------------------------ */

  for (const a of await attendanceSummary(ctx)) {
    const row = report.get(a.studentId);
    if (!row) continue;
    row.attendanceRate = a.rate;
    row.sessionsCounted = a.total;
  }

  return [...report.values()];
}
