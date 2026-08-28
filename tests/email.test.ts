import { beforeAll, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";

import * as schema from "@/db/schema";
import type { ClassContext } from "@/lib/auth/guard";
import { createAssignment, gradeSubmission, returnSubmission, turnIn } from "@/lib/repo/assignments";
import { notifyGradeReturned, notifyNewAssignment } from "@/lib/email/notify";
import { queueMail } from "@/lib/email/send";
import { gradeReturnedMail, newAccountMail, newAssignmentMail } from "@/lib/email/templates";

/* ------------------------------------------------------------------ *
 * Email.
 *
 * Tính chất quan trọng nhất KHÔNG phải là email gửi được, mà là email
 * hỏng thì nghiệp vụ vẫn chạy. Giáo viên bấm "Trả bài" thì bài phải được
 * trả, kể cả khi Resend đang chết hoặc chưa cấu hình key.
 * ------------------------------------------------------------------ */

const db = drizzle(env.DB, { schema });
const C = "mail1";

const ctxFor = (userId: string, classRole: "teacher" | "student") =>
  ({
    user: { id: userId, role: classRole },
    db,
    classId: C,
    classRole,
    klass: { id: C },
  }) as unknown as ClassContext;

const teacher = () => ctxFor("mt", "teacher");
const student = () => ctxFor("ms", "student");

beforeAll(async () => {
  const now = new Date();
  await db.insert(schema.user).values([
    { id: "mt", name: "Cô Lan", email: "mt@t.vn", role: "teacher", createdAt: now, updatedAt: now },
    { id: "ms", name: "Bảo Ngọc", email: "ms@t.vn", role: "student", createdAt: now, updatedAt: now },
    // Học sinh đã bị khoá — không được nhận email nữa.
    { id: "ms2", name: "Đã khoá", email: "ms2@t.vn", role: "student", active: false, createdAt: now, updatedAt: now },
  ]);
  await db.insert(schema.classes).values({
    id: C, name: "Lớp email", code: "MAIL11", subject: "rw", teacherId: "mt", createdAt: now,
  });
  await db.insert(schema.classMembers).values([
    { id: "mcm1", classId: C, userId: "mt", role: "teacher", joinedAt: now },
    { id: "mcm2", classId: C, userId: "ms", role: "student", joinedAt: now },
    { id: "mcm3", classId: C, userId: "ms2", role: "student", joinedAt: now },
  ]);
});

describe("queueMail", () => {
  it("chưa cấu hình RESEND_API_KEY thì bỏ qua, không ném lỗi", async () => {
    const res = await queueMail([{ to: "a@b.vn", subject: "x", html: "<p>x</p>" }]);
    expect(res.skipped).toBe(1);
    expect(res.failed).toBe(0);
  });

  it("danh sách rỗng là no-op", async () => {
    await expect(queueMail([])).resolves.toEqual({ sent: 0, skipped: 0, failed: 0 });
  });
});

describe("Mẫu email", () => {
  it("thoát HTML trong dữ liệu người dùng — chống chèn thẻ", async () => {
    const mail = newAccountMail({
      name: '<script>alert(1)</script>',
      email: "x@y.vn",
      tempPassword: "Abc12345",
      loginUrl: "https://hocsat.vn/login",
    });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
  });

  it("nhận xét của giáo viên cũng được thoát", async () => {
    const mail = gradeReturnedMail({
      studentName: "A",
      className: "B",
      title: "C",
      grade: 9,
      maxPoints: 10,
      feedback: '<img src=x onerror="alert(1)">',
      url: "https://hocsat.vn",
    });
    expect(mail.html).not.toContain("<img src=x");
  });

  it("bài không có hạn nộp vẫn ra email hợp lệ", async () => {
    const mail = newAssignmentMail({
      studentName: "A",
      className: "B",
      title: "C",
      dueText: null,
      url: "https://hocsat.vn",
    });
    expect(mail.html).toContain("Không có hạn nộp");
  });
});

describe("Email không được làm hỏng nghiệp vụ", () => {
  it("giao bài vẫn thành công dù email không gửi được", async () => {
    const aid = await createAssignment(teacher(), {
      title: "Bài có email",
      points: 10,
      allowLate: true,
      publish: true,
      files: [],
    });

    // Không ném, dù chưa có cấu hình email.
    await expect(notifyNewAssignment(teacher(), aid)).resolves.toBeUndefined();

    const row = await db.query.assignments.findFirst({
      where: eq(schema.assignments.id, aid),
    });
    expect(row?.publishedAt).toBeTruthy();
  });

  it("trả bài vẫn thành công dù email không gửi được", async () => {
    const aid = await createAssignment(teacher(), {
      title: "Trả bài có email",
      points: 10,
      allowLate: true,
      publish: true,
      files: [],
    });
    const sid = await turnIn(student(), aid, [
      { r2Key: `class/${C}/submission/x/a.pdf`, fileName: "a.pdf", mime: null, size: 1 },
    ]);
    await gradeSubmission(teacher(), sid, { score: 9, feedback: "tốt" });
    await returnSubmission(teacher(), sid);

    await expect(notifyGradeReturned(teacher(), [sid])).resolves.toBeUndefined();

    const row = await db.query.submissions.findFirst({
      where: eq(schema.submissions.id, sid),
    });
    expect(row?.status).toBe("returned");
  });

  it("bài chưa publish thì không gửi thông báo", async () => {
    const aid = await createAssignment(teacher(), {
      title: "Còn nháp",
      points: 10,
      allowLate: true,
      publish: false,
      files: [],
    });
    // Không ném và cũng không gửi gì — học sinh chưa được biết bài này tồn tại.
    await expect(notifyNewAssignment(teacher(), aid)).resolves.toBeUndefined();
  });

  it("danh sách rỗng thì không làm gì", async () => {
    await expect(notifyGradeReturned(teacher(), [])).resolves.toBeUndefined();
  });
});
