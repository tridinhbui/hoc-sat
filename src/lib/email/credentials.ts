import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { queueMail } from "./send";
import { newAccountMail } from "./templates";

/**
 * Gửi mật khẩu tạm cho tài khoản vừa tạo hoặc vừa reset.
 *
 * Trả về `true` nếu đã xếp hàng gửi được. Trả `false` khi chưa cấu hình
 * email — khi đó admin vẫn đọc mật khẩu trên màn hình, nên tài khoản
 * không bị kẹt. Không bao giờ ném lỗi ra ngoài: email hỏng không được
 * làm hỏng việc tạo tài khoản.
 */
export async function sendCredentials(
  users: { name?: string; email: string; tempPassword: string }[],
): Promise<boolean> {
  if (users.length === 0) return false;

  try {
    const { env } = await getCloudflareContext({ async: true });
    const loginUrl = `${env.BETTER_AUTH_URL || "http://localhost:3000"}/login`;

    const res = await queueMail(
      users.map((u) => ({
        to: u.email,
        ...newAccountMail({
          name: u.name || u.email,
          email: u.email,
          tempPassword: u.tempPassword,
          loginUrl,
        }),
      })),
    );
    return res.sent > 0;
  } catch (e) {
    console.error("[email] Không gửi được mật khẩu tạm:", e);
    return false;
  }
}
