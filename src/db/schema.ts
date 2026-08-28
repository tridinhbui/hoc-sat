import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/sqlite-core";

/* ------------------------------------------------------------------ *
 * Quy ước
 * - Mọi timestamp: integer unix-ms UTC. Hiển thị theo Asia/Ho_Chi_Minh ở UI.
 * - SQLite không có enum → text({enum}) cho type-safety + check() cho DB.
 * - Mọi cột dùng để lọc đều có index: D1 tính tiền theo rows READ.
 * ------------------------------------------------------------------ */

export const ROLES = ["admin", "teacher", "ta", "student"] as const;
export const CLASS_ROLES = ["teacher", "ta", "student"] as const;
export const SUBJECTS = ["rw", "math"] as const;

const id = () => text("id").primaryKey();
const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const now = () => ts("created_at").notNull().$defaultFn(() => new Date());

/* ============================ AUTH (better-auth) ============================ */

export const user = sqliteTable(
  "user",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    image: text("image"),

    // Trường mở rộng của HocSAT
    role: text("role", { enum: ROLES }).notNull().default("student"),
    phone: text("phone"),
    mustChangePassword: integer("must_change_password", { mode: "boolean" })
      .notNull()
      .default(true),
    active: integer("active", { mode: "boolean" }).notNull().default(true),

    createdAt: now(),
    updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("user_email_uq").on(t.email),
    index("user_role_idx").on(t.role),
    check("user_role_ck", sql`${t.role} IN ('admin','teacher','ta','student')`),
  ],
);

export const session = sqliteTable(
  "session",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: ts("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: now(),
    updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [uniqueIndex("session_token_uq").on(t.token), index("session_user_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    /**
     * better-auth >= 1.7 bắt buộc. Tài khoản mật khẩu = "local:credential".
     * Thiếu cột này thì sign-in luôn trả 401 mà không báo lỗi gì rõ ràng.
     */
    issuer: text("issuer").notNull(),
    password: text("password"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: ts("access_token_expires_at"),
    refreshTokenExpiresAt: ts("refresh_token_expires_at"),
    scope: text("scope"),
    createdAt: now(),
    updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    index("account_user_idx").on(t.userId),
    index("account_lookup_idx").on(t.providerId, t.issuer, t.accountId),
  ],
);

export const verification = sqliteTable(
  "verification",
  {
    id: id(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: ts("expires_at").notNull(),
    createdAt: now(),
    updatedAt: ts("updated_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ============================== LỚP HỌC ============================== */

export const classes = sqliteTable(
  "classes",
  {
    id: id(),
    name: text("name").notNull(),
    /** 6 ký tự, bỏ 0/O/1/I/L để không nhầm khi đọc cho học sinh */
    code: text("code").notNull(),
    /** Chọn TRƯỚC khi tạo lớp — quyết định preset đề và UI */
    subject: text("subject", { enum: SUBJECTS }).notNull(),
    teacherId: text("teacher_id").notNull().references(() => user.id),
    scheduleNote: text("schedule_note"),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
    createdAt: now(),
  },
  (t) => [
    uniqueIndex("classes_code_uq").on(t.code),
    index("classes_teacher_idx").on(t.teacherId),
    check("classes_subject_ck", sql`${t.subject} IN ('rw','math')`),
  ],
);

export const classMembers = sqliteTable(
  "class_members",
  {
    id: id(),
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: CLASS_ROLES }).notNull(),
    joinedAt: ts("joined_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("class_members_uq").on(t.classId, t.userId),
    index("class_members_user_idx").on(t.userId),
    check("class_members_role_ck", sql`${t.role} IN ('teacher','ta','student')`),
  ],
);

/* ============================== NỘI DUNG ============================== */

export const announcements = sqliteTable(
  "announcements",
  {
    id: id(),
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull().references(() => user.id),
    content: text("content").notNull(),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    createdAt: now(),
  },
  (t) => [index("announcements_class_idx").on(t.classId, t.createdAt)],
);

export const materials = sqliteTable(
  "materials",
  {
    id: id(),
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull().references(() => user.id),
    title: text("title").notNull(),
    description: text("description"),
    createdAt: now(),
  },
  (t) => [index("materials_class_idx").on(t.classId, t.createdAt)],
);

export const ATTACHMENT_OWNERS = ["announcement", "material", "assignment", "submission"] as const;

export const attachments = sqliteTable(
  "attachments",
  {
    id: id(),
    ownerType: text("owner_type", { enum: ATTACHMENT_OWNERS }).notNull(),
    ownerId: text("owner_id").notNull(),
    /** key trong R2 — file KHÔNG BAO GIỜ nằm trong D1 */
    r2Key: text("r2_key").notNull(),
    fileName: text("file_name").notNull(),
    mime: text("mime"),
    size: integer("size"),
    createdAt: now(),
  },
  (t) => [index("attachments_owner_idx").on(t.ownerType, t.ownerId)],
);

/* ============================ BÀI TẬP & NỘP BÀI ============================ */

export const ASSIGNMENT_KINDS = ["file", "quiz", "mixed"] as const;

export const assignments = sqliteTable(
  "assignments",
  {
    id: id(),
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull().references(() => user.id),
    title: text("title").notNull(),
    description: text("description"),
    kind: text("kind", { enum: ASSIGNMENT_KINDS }).notNull().default("file"),
    dueAt: ts("due_at"),
    points: real("points").notNull().default(100),
    allowLate: integer("allow_late", { mode: "boolean" }).notNull().default(true),
    /** NULL = bản nháp, học sinh không thấy */
    publishedAt: ts("published_at"),
    createdAt: now(),
  },
  (t) => [
    index("assignments_class_idx").on(t.classId, t.dueAt),
    check("assignments_kind_ck", sql`${t.kind} IN ('file','quiz','mixed')`),
  ],
);

export const QUESTION_TYPES = ["mcq", "grid_in", "free_text"] as const;

export const questions = sqliteTable(
  "questions",
  {
    id: id(),
    /** Đúng 1 trong 2 khác NULL — ràng buộc bằng check bên dưới */
    assignmentId: text("assignment_id").references(() => assignments.id, { onDelete: "cascade" }),
    examModuleId: text("exam_module_id").references(() => examModules.id, { onDelete: "cascade" }),

    orderIndex: integer("order_index").notNull().default(0),
    prompt: text("prompt").notNull(),
    imageR2Key: text("image_r2_key"),
    type: text("type", { enum: QUESTION_TYPES }).notNull(),

    /** JSON: [{ key: "A", text: "..." }, ...] */
    choices: text("choices", { mode: "json" }).$type<{ key: string; text: string }[]>(),
    correctAnswer: text("correct_answer"),
    /** JSON array — grid-in nhận nhiều dạng: ["3/4", ".75", "0.75"] */
    acceptedAnswers: text("accepted_answers", { mode: "json" }).$type<string[]>(),

    explanation: text("explanation"),
    points: real("points").notNull().default(1),
    domain: text("domain"),
    skillTag: text("skill_tag"),
    createdAt: now(),
  },
  (t) => [
    index("questions_assignment_idx").on(t.assignmentId, t.orderIndex),
    index("questions_module_idx").on(t.examModuleId, t.orderIndex),
    check("questions_type_ck", sql`${t.type} IN ('mcq','grid_in','free_text')`),
    check(
      "questions_owner_ck",
      sql`(${t.assignmentId} IS NULL) <> (${t.examModuleId} IS NULL)`,
    ),
  ],
);

export const SUBMISSION_STATUS = ["assigned", "turned_in", "returned"] as const;

export const submissions = sqliteTable(
  "submissions",
  {
    id: id(),
    assignmentId: text("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    status: text("status", { enum: SUBMISSION_STATUS }).notNull().default("assigned"),
    turnedInAt: ts("turned_in_at"),
    returnedAt: ts("returned_at"),
    isLate: integer("is_late", { mode: "boolean" }).notNull().default(false),

    /** Máy chấm (mcq + grid_in) */
    autoScore: real("auto_score"),
    /** Giáo viên chấm tay (free_text / bài nộp file) */
    manualScore: real("manual_score"),
    finalGrade: real("final_grade"),

    feedback: text("feedback"),
    gradedBy: text("graded_by").references(() => user.id),
    createdAt: now(),
  },
  (t) => [
    uniqueIndex("submissions_uq").on(t.assignmentId, t.studentId),
    index("submissions_student_idx").on(t.studentId),
    index("submissions_status_idx").on(t.assignmentId, t.status),
    check("submissions_status_ck", sql`${t.status} IN ('assigned','turned_in','returned')`),
  ],
);

export const answers = sqliteTable(
  "answers",
  {
    id: id(),
    submissionId: text("submission_id").references(() => submissions.id, { onDelete: "cascade" }),
    attemptId: text("attempt_id").references(() => examAttempts.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),

    response: text("response"),
    isCorrect: integer("is_correct", { mode: "boolean" }),
    pointsAwarded: real("points_awarded"),
    /** học sinh tự đánh dấu "xem lại" — giống nút flag của Bluebook */
    flagged: integer("flagged", { mode: "boolean" }).notNull().default(false),
    answeredAt: ts("answered_at"),
  },
  (t) => [
    index("answers_submission_idx").on(t.submissionId),
    index("answers_attempt_idx").on(t.attemptId),
    index("answers_question_idx").on(t.questionId),
    uniqueIndex("answers_submission_q_uq").on(t.submissionId, t.questionId),
  ],
);

/* ============================== ĐIỂM DANH ============================== */

export const ATTENDANCE_STATUS = ["present", "absent", "late", "excused"] as const;

export const attendanceSessions = sqliteTable(
  "attendance_sessions",
  {
    id: id(),
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    /** YYYY-MM-DD theo giờ VN — lưu text để không lệch múi giờ khi đổi ngày */
    sessionDate: text("session_date").notNull(),
    title: text("title"),
    createdBy: text("created_by").notNull().references(() => user.id),
    createdAt: now(),
  },
  (t) => [
    uniqueIndex("attendance_sessions_uq").on(t.classId, t.sessionDate),
    index("attendance_sessions_class_idx").on(t.classId, t.sessionDate),
  ],
);

export const attendanceRecords = sqliteTable(
  "attendance_records",
  {
    id: id(),
    sessionId: text("session_id").notNull().references(() => attendanceSessions.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    status: text("status", { enum: ATTENDANCE_STATUS }).notNull(),
    note: text("note"),
    markedBy: text("marked_by").notNull().references(() => user.id),
    markedAt: ts("marked_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("attendance_records_uq").on(t.sessionId, t.studentId),
    index("attendance_records_student_idx").on(t.studentId),
    check("attendance_status_ck", sql`${t.status} IN ('present','absent','late','excused')`),
  ],
);

/* ============================== CALENDAR ============================== */

export const EVENT_TYPES = ["class", "deadline", "midterm", "final", "other"] as const;

export const calendarEvents = sqliteTable(
  "calendar_events",
  {
    id: id(),
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    type: text("type", { enum: EVENT_TYPES }).notNull().default("class"),
    startAt: ts("start_at").notNull(),
    endAt: ts("end_at"),
    allDay: integer("all_day", { mode: "boolean" }).notNull().default(false),
    createdBy: text("created_by").notNull().references(() => user.id),
    createdAt: now(),
  },
  (t) => [index("calendar_events_class_idx").on(t.classId, t.startAt)],
);

/* ============================== THI & LOCKDOWN ============================== */

export const EXAM_KINDS = ["midterm", "final", "practice"] as const;

export const exams = sqliteTable(
  "exams",
  {
    id: id(),
    classId: text("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind", { enum: EXAM_KINDS }).notNull().default("practice"),
    openAt: ts("open_at").notNull(),
    closeAt: ts("close_at").notNull(),
    lockdown: integer("lockdown", { mode: "boolean" }).notNull().default(true),
    violationLimit: integer("violation_limit").notNull().default(3),
    /** true = học sinh được xem đáp án + giải thích */
    released: integer("released", { mode: "boolean" }).notNull().default(false),
    createdBy: text("created_by").notNull().references(() => user.id),
    createdAt: now(),
  },
  (t) => [index("exams_class_idx").on(t.classId, t.openAt)],
);

/** Preset SAT: Math 35 phút / 22 câu · RW 32 phút / 27 câu */
export const examModules = sqliteTable(
  "exam_modules",
  {
    id: id(),
    examId: text("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull().default(0),
    name: text("name").notNull(),
    subject: text("subject", { enum: SUBJECTS }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    questionCount: integer("question_count").notNull(),
  },
  (t) => [index("exam_modules_exam_idx").on(t.examId, t.orderIndex)],
);

export const ATTEMPT_STATUS = [
  "not_started",
  "in_progress",
  "submitted",
  "auto_submitted",
  "voided",
] as const;

export const examAttempts = sqliteTable(
  "exam_attempts",
  {
    id: id(),
    examId: text("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    status: text("status", { enum: ATTEMPT_STATUS }).notNull().default("not_started"),
    startedAt: ts("started_at"),
    submittedAt: ts("submitted_at"),
    currentModuleId: text("current_module_id"),
    totalScore: real("total_score"),
    violationCount: integer("violation_count").notNull().default(0),
  },
  (t) => [
    uniqueIndex("exam_attempts_uq").on(t.examId, t.studentId),
    index("exam_attempts_student_idx").on(t.studentId),
  ],
);

export const moduleAttempts = sqliteTable(
  "module_attempts",
  {
    id: id(),
    attemptId: text("attempt_id").notNull().references(() => examAttempts.id, { onDelete: "cascade" }),
    moduleId: text("module_id").notNull().references(() => examModules.id, { onDelete: "cascade" }),
    startedAt: ts("started_at"),
    /** SERVER tính = startedAt + durationMinutes. Client chỉ vẽ countdown. */
    expiresAt: ts("expires_at"),
    submittedAt: ts("submitted_at"),
  },
  (t) => [uniqueIndex("module_attempts_uq").on(t.attemptId, t.moduleId)],
);

export const PROCTOR_EVENT_TYPES = [
  "blur",
  "visibility_hidden",
  "fullscreen_exit",
  "copy",
  "paste",
  "contextmenu",
  "devtools",
  "resize",
  "disconnect",
  "multi_tab",
] as const;

export const proctorEvents = sqliteTable(
  "proctor_events",
  {
    id: id(),
    attemptId: text("attempt_id").notNull().references(() => examAttempts.id, { onDelete: "cascade" }),
    type: text("type", { enum: PROCTOR_EVENT_TYPES }).notNull(),
    occurredAt: ts("occurred_at").notNull(),
    meta: text("meta", { mode: "json" }).$type<Record<string, unknown>>(),
  },
  (t) => [index("proctor_events_attempt_idx").on(t.attemptId, t.occurredAt)],
);

/* ============================== TYPES ============================== */

export type User = typeof user.$inferSelect;
export type Role = (typeof ROLES)[number];
export type ClassRole = (typeof CLASS_ROLES)[number];
export type Subject = (typeof SUBJECTS)[number];
export type Class = typeof classes.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
