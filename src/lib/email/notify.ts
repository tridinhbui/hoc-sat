import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { ClassContext } from "@/lib/auth/guard";
import { assignmentTargets, returnedTargets } from "@/lib/repo/notify-targets";
import { fmtDateTime } from "@/lib/utils/date";
import { queueMail } from "./send";
import { gradeReturnedMail, newAssignmentMail } from "./templates";

/* ------------------------------------------------------------------ *
 * Nối email vào các mốc nghiệp vụ.
 *
 * Tầng này chỉ dựng nội dung và gửi — truy vấn người nhận nằm ở
 * `repo/notify-targets.ts`, đúng quy tắc mọi query đều trong repo layer.
 *
 * Nguyên tắc: email KHÔNG BAO GIỜ làm hỏng thao tác vừa rồi. Mọi hàm ở
 * đây nuốt lỗi và chỉ log — giáo viên bấm "Trả bài" thì bài phải được
 * trả, kể cả khi Resend đang chết.
 * ------------------------------------------------------------------ */

async function baseUrl(): Promise<string> {
  const { env } = await getCloudflareContext({ async: true });
  return env.BETTER_AUTH_URL || "http://localhost:3000";
}

/**
 * Báo cả lớp có bài tập mới. Gọi khi bài chuyển từ nháp sang đã giao —
 * KHÔNG gọi mỗi lần sửa, nếu không học sinh bị spam.
 */
export async function notifyNewAssignment(ctx: ClassContext, assignmentId: string) {
  try {
    const t = await assignmentTargets(ctx, assignmentId);
    if (!t?.published || t.students.length === 0) return;

    const base = await baseUrl();
    await queueMail(
      t.students.map((s) => ({
        to: s.email,
        ...newAssignmentMail({
          studentName: s.name,
          className: t.className,
          title: t.title,
          dueText: t.dueAt ? fmtDateTime(t.dueAt) : null,
          url: `${base}/student/classes/${ctx.classId}/assignments/${assignmentId}`,
        }),
      })),
    );
  } catch (e) {
    console.error("[email] Không gửi được thông báo bài tập mới:", e);
  }
}

/** Báo học sinh rằng bài đã được trả, kèm điểm và nhận xét. */
export async function notifyGradeReturned(ctx: ClassContext, submissionIds: string[]) {
  if (submissionIds.length === 0) return;

  try {
    const targets = await returnedTargets(ctx, submissionIds);
    if (targets.length === 0) return;

    const base = await baseUrl();
    await queueMail(
      targets.map((t) => ({
        to: t.studentEmail,
        ...gradeReturnedMail({
          studentName: t.studentName,
          className: t.className,
          title: t.title,
          grade: t.grade,
          maxPoints: t.points,
          feedback: t.feedback,
          url: `${base}/student/classes/${ctx.classId}/assignments/${t.assignmentId}`,
        }),
      })),
    );
  } catch (e) {
    console.error("[email] Không gửi được thông báo trả bài:", e);
  }
}
