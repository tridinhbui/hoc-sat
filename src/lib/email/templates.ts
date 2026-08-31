/* ------------------------------------------------------------------ *
 * Mẫu email.
 *
 * HTML thuần với inline style — client email (nhất là Outlook) không đọc
 * được CSS ngoài, class, hay biến CSS. Không dùng lại design system ở đây
 * được, nhưng vẫn giữ đúng màu và giọng điệu.
 * ------------------------------------------------------------------ */

const INK = "#0f1b45";
const PRIMARY = "#5b6cff";
const MUTED = "#7c89ad";
const BG = "#f2f6ff";

function layout(opts: { title: string; body: string; cta?: { href: string; label: string } }) {
  return `<!doctype html>
<html lang="vi"><body style="margin:0;padding:24px;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:20px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 24px;font-size:18px;font-weight:800;color:${INK};letter-spacing:-0.02em;">AtlasSAT</p>
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:${INK};letter-spacing:-0.02em;line-height:1.3;">${opts.title}</h1>
        <div style="font-size:15px;line-height:1.6;color:#3b4a72;">${opts.body}</div>
        ${
          opts.cta
            ? `<p style="margin:28px 0 0;"><a href="${opts.cta.href}" style="display:inline-block;background:${PRIMARY};color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:999px;">${opts.cta.label}</a></p>`
            : ""
        }
        <p style="margin:28px 0 0;font-size:13px;color:${MUTED};">
          Email tự động từ hệ thống AtlasSAT. Có gì chưa rõ, nhắn giáo viên hoặc trung tâm nhé.
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Tài khoản mới — kèm mật khẩu tạm, ép đổi ở lần đăng nhập đầu. */
export function newAccountMail(input: {
  name: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}) {
  return {
    subject: "Tài khoản AtlasSAT của bạn",
    html: layout({
      title: `Chào ${esc(input.name)}`,
      body: `
        <p style="margin:0 0 16px;">Trung tâm đã tạo tài khoản AtlasSAT cho bạn.</p>
        <table role="presentation" style="width:100%;background:#edf2ff;border-radius:14px;padding:16px;margin:0 0 16px;">
          <tr><td style="font-size:14px;color:${MUTED};padding-bottom:4px;">Email đăng nhập</td></tr>
          <tr><td style="font-size:15px;font-weight:600;color:${INK};padding-bottom:12px;">${esc(input.email)}</td></tr>
          <tr><td style="font-size:14px;color:${MUTED};padding-bottom:4px;">Mật khẩu tạm</td></tr>
          <tr><td style="font-size:18px;font-weight:700;color:${INK};font-family:ui-monospace,monospace;">${esc(input.tempPassword)}</td></tr>
        </table>
        <p style="margin:0;">Lần đăng nhập đầu tiên bạn sẽ được yêu cầu đặt mật khẩu riêng. Đừng chia sẻ mật khẩu tạm này với ai.</p>`,
      cta: { href: input.loginUrl, label: "Đăng nhập" },
    }),
  };
}

/** Bài tập mới được giao. */
export function newAssignmentMail(input: {
  studentName: string;
  className: string;
  title: string;
  dueText: string | null;
  url: string;
}) {
  return {
    subject: `Bài tập mới: ${input.title}`,
    html: layout({
      title: "Có bài tập mới",
      body: `
        <p style="margin:0 0 12px;">Chào ${esc(input.studentName)},</p>
        <p style="margin:0 0 16px;">Lớp <strong style="color:${INK};">${esc(input.className)}</strong> vừa có bài tập mới:</p>
        <p style="margin:0 0 8px;font-size:17px;font-weight:700;color:${INK};">${esc(input.title)}</p>
        ${
          input.dueText
            ? `<p style="margin:0;color:${MUTED};">Hạn nộp: ${esc(input.dueText)}</p>`
            : `<p style="margin:0;color:${MUTED};">Không có hạn nộp.</p>`
        }`,
      cta: { href: input.url, label: "Xem bài tập" },
    }),
  };
}

/** Bài đã được trả — có điểm và nhận xét. */
export function gradeReturnedMail(input: {
  studentName: string;
  className: string;
  title: string;
  grade: number | null;
  maxPoints: number;
  feedback: string | null;
  url: string;
}) {
  return {
    subject: `Đã trả bài: ${input.title}`,
    html: layout({
      title: "Bài của bạn đã được trả",
      body: `
        <p style="margin:0 0 12px;">Chào ${esc(input.studentName)},</p>
        <p style="margin:0 0 16px;">Giáo viên đã chấm xong bài <strong style="color:${INK};">${esc(input.title)}</strong>, lớp ${esc(input.className)}.</p>
        ${
          input.grade !== null
            ? `<p style="margin:0 0 16px;font-size:28px;font-weight:800;color:${INK};">${input.grade}<span style="font-size:18px;color:${MUTED};">/${input.maxPoints}</span></p>`
            : ""
        }
        ${
          input.feedback
            ? `<div style="background:#e4e8ff;border-radius:14px;padding:16px;margin:0 0 8px;">
                 <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:${PRIMARY};">Nhận xét của giáo viên</p>
                 <p style="margin:0;white-space:pre-wrap;">${esc(input.feedback)}</p>
               </div>`
            : ""
        }`,
      cta: { href: input.url, label: "Xem chi tiết" },
    }),
  };
}
