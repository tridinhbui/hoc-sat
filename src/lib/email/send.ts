import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/* ------------------------------------------------------------------ *
 * Gửi email qua Resend.
 *
 * Gọi thẳng REST API bằng fetch thay vì kéo SDK: Worker tính theo dung
 * lượng bundle, mà việc cần làm chỉ là một POST.
 *
 * Email KHÔNG BAO GIỜ được chặn luồng chính. Giáo viên bấm "Trả bài" mà
 * phải chờ 30 email gửi xong thì trang treo. Dùng `waitUntil` để gửi sau
 * khi response đã trả về.
 * ------------------------------------------------------------------ */

export type Mail = {
  to: string | string[];
  subject: string;
  html: string;
};

type SendResult = { sent: number; skipped: number; failed: number };

async function postToResend(apiKey: string, from: string, mail: Mail) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(mail.to) ? mail.to : [mail.to],
      subject: mail.subject,
      html: mail.html,
    }),
  });
  if (!res.ok) {
    // Không ném ra ngoài: email hỏng không được làm hỏng thao tác vừa rồi.
    console.error("Resend lỗi", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

/**
 * Xếp hàng gửi email. Trả về ngay; việc gửi chạy tiếp sau response.
 *
 * Chưa cấu hình RESEND_API_KEY thì bỏ qua trong im lặng có chủ đích —
 * dev và test không cần email, và thiếu key không nên làm hỏng luồng.
 */
export async function queueMail(mails: Mail[]): Promise<SendResult> {
  if (mails.length === 0) return { sent: 0, skipped: 0, failed: 0 };

  const { env, ctx } = await getCloudflareContext({ async: true });
  const apiKey = env.RESEND_API_KEY;
  const from = env.MAIL_FROM;

  if (!apiKey || !from) {
    console.warn(`[email] Bỏ qua ${mails.length} email: chưa cấu hình RESEND_API_KEY/MAIL_FROM.`);
    return { sent: 0, skipped: mails.length, failed: 0 };
  }

  const work = Promise.all(mails.map((m) => postToResend(apiKey, from, m)));

  if (ctx?.waitUntil) {
    ctx.waitUntil(work);
    return { sent: mails.length, skipped: 0, failed: 0 };
  }

  // Không có waitUntil (dev, test): chờ luôn để không mất email.
  const results = await work;
  return {
    sent: results.filter(Boolean).length,
    skipped: 0,
    failed: results.filter((r) => !r).length,
  };
}
