import "server-only";
import { and, asc, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { answers, assignments, attachments, classMembers, questions, submissions, user } from "@/db/schema";
import type { AuthContext, ClassContext } from "@/lib/auth/guard";
import { ForbiddenError, canGrade, canPost } from "@/lib/auth/policy";
import { getBucket } from "@/lib/storage/r2";
import { autoGradeSubmission } from "./questions";
import type { UploadedFile } from "./materials";

/* ------------------------------------------------------------------ *
 * Bài tập & nộp bài.
 *
 * Hai luật xuyên suốt file này:
 *  - Bài chưa publish (published_at IS NULL) học sinh KHÔNG được thấy,
 *    kể cả khi biết id.
 *  - Học sinh chỉ chạm được vào bài nộp của chính mình.
 * ------------------------------------------------------------------ */

const isStaff = (ctx: ClassContext) => canGrade(ctx.classRole);

function assertStaff(ctx: ClassContext) {
  if (!isStaff(ctx)) throw new ForbiddenError("Chức năng này dành cho giáo viên và trợ giảng.");
}

/** Chỉ nhận file đã upload vào đúng thư mục của lớp này. */
function assertFilesBelongToClass(ctx: ClassContext, files: UploadedFile[]) {
  const prefix = `class/${ctx.classId}/`;
  if (files.some((f) => !f.r2Key.startsWith(prefix))) {
    throw new ForbiddenError("File không thuộc lớp này.");
  }
}

async function insertAttachments(
  ctx: ClassContext | AuthContext,
  ownerType: "assignment" | "submission",
  ownerId: string,
  files: UploadedFile[],
) {
  if (files.length === 0) return;
  await ctx.db.insert(attachments).values(
    files.map((f) => ({
      id: crypto.randomUUID(),
      ownerType,
      ownerId,
      r2Key: f.r2Key,
      fileName: f.fileName,
      mime: f.mime,
      size: f.size,
    })),
  );
}

async function attachmentsFor(
  ctx: ClassContext | AuthContext,
  ownerType: "assignment" | "submission",
  ownerIds: string[],
) {
  if (ownerIds.length === 0) return [];
  return ctx.db.query.attachments.findMany({
    where: and(eq(attachments.ownerType, ownerType), inArray(attachments.ownerId, ownerIds)),
  });
}

/* ----------------------------- Đọc bài tập ----------------------------- */

export type AssignmentListItem = {
  id: string;
  title: string;
  kind: "file" | "quiz" | "mixed";
  dueAt: Date | null;
  points: number;
  publishedAt: Date | null;
  createdAt: Date;
  /** Tính ở server theo thời điểm request — UI không tự tính luật nghiệp vụ. */
  overdue: boolean;
  /** Chỉ có với giáo viên/TA */
  turnedIn?: number;
  totalStudents?: number;
  /** Chỉ có với học sinh */
  myStatus?: "assigned" | "turned_in" | "returned";
  myGrade?: number | null;
};

export async function listAssignments(ctx: ClassContext): Promise<AssignmentListItem[]> {
  const staff = isStaff(ctx);

  const now = Date.now();
  const rows = await ctx.db.query.assignments.findMany({
    where: staff
      ? eq(assignments.classId, ctx.classId)
      : // Học sinh chỉ thấy bài đã publish.
        and(eq(assignments.classId, ctx.classId), isNotNull(assignments.publishedAt)),
    orderBy: [desc(assignments.createdAt)],
    limit: 100,
  });
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  if (staff) {
    const [counts, [students]] = await Promise.all([
      ctx.db
        .select({ assignmentId: submissions.assignmentId, n: count() })
        .from(submissions)
        .where(
          and(
            inArray(submissions.assignmentId, ids),
            inArray(submissions.status, ["turned_in", "returned"]),
          ),
        )
        .groupBy(submissions.assignmentId),
      ctx.db
        .select({ n: count() })
        .from(classMembers)
        .where(and(eq(classMembers.classId, ctx.classId), eq(classMembers.role, "student"))),
    ]);

    const byId = new Map(counts.map((c) => [c.assignmentId, c.n]));
    return rows.map((r) => ({
      ...r,
      overdue: !!r.dueAt && r.dueAt.getTime() < now,
      turnedIn: byId.get(r.id) ?? 0,
      totalStudents: students?.n ?? 0,
    }));
  }

  const mine = await ctx.db.query.submissions.findMany({
    where: and(inArray(submissions.assignmentId, ids), eq(submissions.studentId, ctx.user.id)),
  });
  const byId = new Map(mine.map((s) => [s.assignmentId, s]));

  return rows.map((r) => {
    const s = byId.get(r.id);
    return {
      ...r,
      overdue: !!r.dueAt && r.dueAt.getTime() < now,
      myStatus: s?.status ?? "assigned",
      // Điểm chỉ lộ ra sau khi giáo viên bấm Trả bài.
      myGrade: s?.status === "returned" ? s.finalGrade : null,
    };
  });
}

export async function getAssignment(ctx: ClassContext, assignmentId: string) {
  const row = await ctx.db.query.assignments.findFirst({
    where: and(eq(assignments.id, assignmentId), eq(assignments.classId, ctx.classId)),
  });
  if (!row) throw new ForbiddenError("Bài tập không tồn tại.");
  // Bài nháp: học sinh không được thấy dù có id.
  if (!row.publishedAt && !isStaff(ctx)) throw new ForbiddenError("Bài tập không tồn tại.");

  const files = await attachmentsFor(ctx, "assignment", [row.id]);
  return { ...row, files, overdue: !!row.dueAt && row.dueAt.getTime() < Date.now() };
}

/* ---------------------------- Ghi bài tập ---------------------------- */

export async function createAssignment(
  ctx: ClassContext,
  input: {
    title: string;
    description?: string;
    dueAt?: Date | null;
    points: number;
    allowLate: boolean;
    publish: boolean;
    files: UploadedFile[];
  },
) {
  if (!canPost(ctx.classRole)) throw new ForbiddenError("Chỉ giáo viên và TA được giao bài.");

  const title = input.title.trim();
  if (!title) throw new Error("Bài tập cần có tiêu đề.");
  if (!Number.isFinite(input.points) || input.points <= 0) {
    throw new Error("Điểm tối đa phải là số dương.");
  }
  assertFilesBelongToClass(ctx, input.files);

  const id = crypto.randomUUID();
  await ctx.db.insert(assignments).values({
    id,
    classId: ctx.classId,
    authorId: ctx.user.id,
    title,
    description: input.description?.trim() || null,
    kind: "file",
    dueAt: input.dueAt ?? null,
    points: input.points,
    allowLate: input.allowLate,
    publishedAt: input.publish ? new Date() : null,
  });
  await insertAttachments(ctx, "assignment", id, input.files);
  return id;
}

export async function updateAssignment(
  ctx: ClassContext,
  assignmentId: string,
  patch: {
    title?: string;
    description?: string;
    dueAt?: Date | null;
    points?: number;
    allowLate?: boolean;
  },
) {
  assertStaff(ctx);
  await getAssignment(ctx, assignmentId);

  const set: Record<string, unknown> = {};
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) throw new Error("Bài tập cần có tiêu đề.");
    set.title = t;
  }
  if (patch.description !== undefined) set.description = patch.description.trim() || null;
  if (patch.dueAt !== undefined) set.dueAt = patch.dueAt;
  if (patch.points !== undefined) {
    if (!Number.isFinite(patch.points) || patch.points <= 0) {
      throw new Error("Điểm tối đa phải là số dương.");
    }
    set.points = patch.points;
  }
  if (patch.allowLate !== undefined) set.allowLate = patch.allowLate;
  if (Object.keys(set).length === 0) return;

  await ctx.db.update(assignments).set(set).where(eq(assignments.id, assignmentId));
}

export async function setPublished(ctx: ClassContext, assignmentId: string, publish: boolean) {
  assertStaff(ctx);
  const row = await getAssignment(ctx, assignmentId);

  // Đã có người nộp thì không cho rút về nháp — học sinh sẽ mất chỗ xem bài đã nộp.
  if (!publish) {
    const [{ n } = { n: 0 }] = await ctx.db
      .select({ n: count() })
      .from(submissions)
      .where(
        and(
          eq(submissions.assignmentId, assignmentId),
          inArray(submissions.status, ["turned_in", "returned"]),
        ),
      );
    if (n > 0) throw new ForbiddenError("Đã có học sinh nộp bài, không rút về nháp được nữa.");
  }

  await ctx.db
    .update(assignments)
    .set({ publishedAt: publish ? (row.publishedAt ?? new Date()) : null })
    .where(eq(assignments.id, assignmentId));
}

export async function deleteAssignment(ctx: ClassContext, assignmentId: string) {
  if (ctx.classRole !== "teacher") {
    throw new ForbiddenError("Chỉ giáo viên được xoá bài tập.");
  }
  await getAssignment(ctx, assignmentId);

  const subs = await ctx.db.query.submissions.findMany({
    where: eq(submissions.assignmentId, assignmentId),
  });
  const files = [
    ...(await attachmentsFor(ctx, "assignment", [assignmentId])),
    ...(await attachmentsFor(ctx, "submission", subs.map((s) => s.id))),
  ];

  // D1 trước, R2 sau: hỏng ở bước sau chỉ để lại file mồ côi, không để lại
  // bản ghi trỏ vào file đã mất.
  await ctx.db.delete(assignments).where(eq(assignments.id, assignmentId));
  await ctx.db
    .delete(attachments)
    .where(
      and(
        eq(attachments.ownerType, "assignment"),
        eq(attachments.ownerId, assignmentId),
      ),
    );

  const bucket = await getBucket();
  await Promise.all(files.map((f) => bucket.delete(f.r2Key)));
}

/* ------------------------- Bảng theo dõi nộp bài ------------------------- */

export async function listSubmissions(ctx: ClassContext, assignmentId: string) {
  assertStaff(ctx);
  await getAssignment(ctx, assignmentId);

  // Bắt đầu từ roster chứ không từ bảng submissions: học sinh chưa nộp thì
  // chưa có dòng nào, mà giáo viên cần thấy đủ cả lớp.
  const rows = await ctx.db
    .select({
      studentId: user.id,
      name: user.name,
      email: user.email,
      submissionId: submissions.id,
      status: submissions.status,
      turnedInAt: submissions.turnedInAt,
      returnedAt: submissions.returnedAt,
      isLate: submissions.isLate,
      manualScore: submissions.manualScore,
      finalGrade: submissions.finalGrade,
      feedback: submissions.feedback,
    })
    .from(classMembers)
    .innerJoin(user, eq(user.id, classMembers.userId))
    .leftJoin(
      submissions,
      and(eq(submissions.studentId, user.id), eq(submissions.assignmentId, assignmentId)),
    )
    .where(and(eq(classMembers.classId, ctx.classId), eq(classMembers.role, "student")))
    .orderBy(asc(user.name));

  const files = await attachmentsFor(
    ctx,
    "submission",
    rows.map((r) => r.submissionId).filter((x): x is string => !!x),
  );

  return rows.map((r) => ({
    ...r,
    status: r.status ?? ("assigned" as const),
    files: files.filter((f) => f.ownerId === r.submissionId),
  }));
}

/** Số bài đã nộp nhưng chưa trả — con số "Chưa chấm" trên dashboard. */
export async function countUngraded(ctx: ClassContext): Promise<number> {
  if (!isStaff(ctx)) return 0;
  const [row] = await ctx.db
    .select({ n: count() })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .where(and(eq(assignments.classId, ctx.classId), eq(submissions.status, "turned_in")));
  return row?.n ?? 0;
}

/* ---------------------------- Học sinh nộp bài ---------------------------- */

export async function getMySubmission(ctx: ClassContext, assignmentId: string) {
  const row = await ctx.db.query.submissions.findFirst({
    where: and(
      eq(submissions.assignmentId, assignmentId),
      eq(submissions.studentId, ctx.user.id),
    ),
  });
  if (!row) return null;
  const files = await attachmentsFor(ctx, "submission", [row.id]);
  return { ...row, files };
}

export async function turnIn(
  ctx: ClassContext,
  assignmentId: string,
  files: UploadedFile[],
) {
  if (ctx.classRole !== "student") {
    throw new ForbiddenError("Chỉ học sinh mới nộp bài.");
  }
  const a = await getAssignment(ctx, assignmentId);
  assertFilesBelongToClass(ctx, files);

  const [{ n: questionCount } = { n: 0 }] = await ctx.db
    .select({ n: count() })
    .from(questions)
    .where(eq(questions.assignmentId, assignmentId));

  // Bài trắc nghiệm nộp bằng đáp án, không cần file đính kèm.
  if (questionCount === 0 && files.length === 0) {
    throw new Error("Đính kèm ít nhất một file trước khi nộp nhé.");
  }

  const now = new Date();
  const late = !!a.dueAt && now > a.dueAt;
  if (late && !a.allowLate) {
    throw new ForbiddenError("Bài này đã quá hạn và không nhận nộp trễ.");
  }

  const existing = await getMySubmission(ctx, assignmentId);
  if (existing?.status === "returned") {
    throw new ForbiddenError("Bài đã được trả, không nộp lại được nữa.");
  }

  const id = existing?.id ?? crypto.randomUUID();
  if (existing) {
    // Nộp lại: thay toàn bộ file cũ.
    await ctx.db
      .delete(attachments)
      .where(and(eq(attachments.ownerType, "submission"), eq(attachments.ownerId, id)));
    await ctx.db
      .update(submissions)
      .set({ status: "turned_in", turnedInAt: now, isLate: late })
      .where(eq(submissions.id, id));
  } else {
    await ctx.db.insert(submissions).values({
      id,
      assignmentId,
      studentId: ctx.user.id,
      status: "turned_in",
      turnedInAt: now,
      isLate: late,
    });
  }
  await insertAttachments(ctx, "submission", id, files);

  // Chấm máy ngay lúc nộp. Điểm vẫn kín cho tới khi giáo viên bấm trả bài.
  if (questionCount > 0) await autoGradeSubmission(ctx, id);

  return id;
}

/**
 * Mở bài trắc nghiệm: tạo sẵn dòng submission để có chỗ lưu tạm đáp án
 * trong lúc học sinh đang làm.
 */
export async function startQuiz(ctx: ClassContext, assignmentId: string) {
  if (ctx.classRole !== "student") throw new ForbiddenError("Chỉ học sinh mới làm bài.");
  await getAssignment(ctx, assignmentId);

  const existing = await getMySubmission(ctx, assignmentId);
  if (existing) return existing;

  const id = crypto.randomUUID();
  await ctx.db.insert(submissions).values({
    id,
    assignmentId,
    studentId: ctx.user.id,
    status: "assigned",
  });
  return (await getMySubmission(ctx, assignmentId))!;
}

/** Huỷ nộp để sửa lại — chỉ khi giáo viên chưa trả bài. */
export async function unsubmit(ctx: ClassContext, assignmentId: string) {
  if (ctx.classRole !== "student") throw new ForbiddenError();

  const existing = await getMySubmission(ctx, assignmentId);
  if (!existing) throw new ForbiddenError("Bạn chưa nộp bài này.");
  if (existing.status === "returned") {
    throw new ForbiddenError("Bài đã được trả, không huỷ nộp được nữa.");
  }

  // Xoá luôn kết quả chấm máy: nếu giữ lại, học sinh có thể nộp thử rồi
  // huỷ nộp nhiều lần để dò ra đáp án đúng.
  await ctx.db.batch([
    ctx.db
      .update(answers)
      .set({ isCorrect: null, pointsAwarded: null })
      .where(eq(answers.submissionId, existing.id)),
    ctx.db
      .update(submissions)
      .set({
        status: "assigned",
        turnedInAt: null,
        isLate: false,
        autoScore: null,
        finalGrade: null,
      })
      .where(eq(submissions.id, existing.id)),
  ]);
}

/* ------------------------------ Chấm bài ------------------------------ */

async function loadSubmissionInClass(ctx: ClassContext, submissionId: string) {
  const [row] = await ctx.db
    .select({ sub: submissions, assignment: assignments })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .where(and(eq(submissions.id, submissionId), eq(assignments.classId, ctx.classId)));
  if (!row) throw new ForbiddenError("Bài nộp không tồn tại trong lớp này.");
  return row;
}

export async function gradeSubmission(
  ctx: ClassContext,
  submissionId: string,
  input: { score: number | null; feedback: string },
) {
  assertStaff(ctx);
  const { assignment, sub } = await loadSubmissionInClass(ctx, submissionId);

  if (input.score !== null) {
    if (!Number.isFinite(input.score) || input.score < 0) {
      throw new Error("Điểm phải là số không âm.");
    }
    const ceiling = assignment.points - (sub.autoScore ?? 0);
    if (input.score > ceiling) {
      throw new Error(
        sub.autoScore
          ? `Máy đã chấm ${sub.autoScore} điểm, phần chấm tay không quá ${ceiling}.`
          : `Điểm không vượt quá ${assignment.points}.`,
      );
    }
  }

  await ctx.db
    .update(submissions)
    .set({
      manualScore: input.score,
      // Điểm cuối = máy chấm (trắc nghiệm) + tay chấm (tự luận / bài nộp file).
      finalGrade:
        sub.autoScore === null && input.score === null
          ? null
          : (sub.autoScore ?? 0) + (input.score ?? 0),
      feedback: input.feedback.trim() || null,
      gradedBy: ctx.user.id,
    })
    .where(eq(submissions.id, submissionId));
}

/** Trả bài — mốc duy nhất khiến điểm và nhận xét hiện ra với học sinh. */
export async function returnSubmission(ctx: ClassContext, submissionId: string) {
  assertStaff(ctx);
  const { sub } = await loadSubmissionInClass(ctx, submissionId);
  if (sub.status === "assigned") throw new ForbiddenError("Học sinh chưa nộp bài này.");

  await ctx.db
    .update(submissions)
    .set({ status: "returned", returnedAt: new Date() })
    .where(eq(submissions.id, submissionId));
}

/** Trả cả lượt cho những bài đã chấm — tránh bấm 30 lần. */
export async function returnAllGraded(ctx: ClassContext, assignmentId: string) {
  assertStaff(ctx);
  await getAssignment(ctx, assignmentId);

  const res = await ctx.db
    .update(submissions)
    .set({ status: "returned", returnedAt: new Date() })
    .where(
      and(
        eq(submissions.assignmentId, assignmentId),
        eq(submissions.status, "turned_in"),
        isNotNull(submissions.finalGrade),
      ),
    );
  return res.meta.changes ?? 0;
}

/* --------------------------- Bảng điểm học sinh --------------------------- */

export async function listMyGrades(ctx: ClassContext) {
  return ctx.db
    .select({
      assignmentId: assignments.id,
      title: assignments.title,
      points: assignments.points,
      dueAt: assignments.dueAt,
      grade: submissions.finalGrade,
      feedback: submissions.feedback,
      returnedAt: submissions.returnedAt,
      isLate: submissions.isLate,
    })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .where(
      and(
        eq(assignments.classId, ctx.classId),
        eq(submissions.studentId, ctx.user.id),
        eq(submissions.status, "returned"),
      ),
    )
    .orderBy(desc(submissions.returnedAt));
}

/** Việc cần làm trên dashboard học sinh: bài đã publish mà chưa nộp. */
export async function listTodoForStudent(ctx: AuthContext, limit = 8) {
  const now = Date.now();
  const rows = await ctx.db
    .select({
      assignmentId: assignments.id,
      classId: assignments.classId,
      title: assignments.title,
      dueAt: assignments.dueAt,
    })
    .from(assignments)
    .innerJoin(classMembers, eq(classMembers.classId, assignments.classId))
    .leftJoin(
      submissions,
      and(
        eq(submissions.assignmentId, assignments.id),
        eq(submissions.studentId, ctx.user.id),
      ),
    )
    .where(
      and(
        eq(classMembers.userId, ctx.user.id),
        eq(classMembers.role, "student"),
        isNotNull(assignments.publishedAt),
        sql`(${submissions.status} IS NULL OR ${submissions.status} = 'assigned')`,
      ),
    )
    .orderBy(asc(assignments.dueAt))
    .limit(limit);

  return rows.map((r) => ({ ...r, overdue: !!r.dueAt && r.dueAt.getTime() < now }));
}

/* ------------------ Số liệu cho dashboard (nhiều lớp) ------------------ */

/** Các lớp mà user đang là giáo viên hoặc TA. */
async function staffClassIds(ctx: AuthContext): Promise<string[]> {
  const rows = await ctx.db
    .select({ classId: classMembers.classId })
    .from(classMembers)
    .where(
      and(
        eq(classMembers.userId, ctx.user.id),
        inArray(classMembers.role, ["teacher", "ta"]),
      ),
    );
  return rows.map((r) => r.classId);
}

/** Tổng số bài đã nộp chưa trả, theo từng lớp mình phụ trách. */
export async function countUngradedByClass(ctx: AuthContext): Promise<Map<string, number>> {
  const ids = await staffClassIds(ctx);
  if (ids.length === 0) return new Map();

  const rows = await ctx.db
    .select({ classId: assignments.classId, n: count() })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .where(
      and(inArray(assignments.classId, ids), eq(submissions.status, "turned_in")),
    )
    .groupBy(assignments.classId);

  return new Map(rows.map((r) => [r.classId, r.n]));
}

/** Bài đã giao, còn hạn, sắp đến hạn trong `days` ngày tới. */
export async function countDueSoon(ctx: AuthContext, days = 7): Promise<number> {
  const ids = await staffClassIds(ctx);
  if (ids.length === 0) return 0;

  const now = new Date();
  const until = new Date(now.getTime() + days * 86_400_000);

  const [row] = await ctx.db
    .select({ n: count() })
    .from(assignments)
    .where(
      and(
        inArray(assignments.classId, ids),
        isNotNull(assignments.publishedAt),
        isNotNull(assignments.dueAt),
        sql`${assignments.dueAt} BETWEEN ${now.getTime()} AND ${until.getTime()}`,
      ),
    );
  return row?.n ?? 0;
}
