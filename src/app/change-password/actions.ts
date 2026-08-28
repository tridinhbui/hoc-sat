"use server";

import { headers } from "next/headers";
import { requireUser } from "@/lib/auth/guard";
import { getAuth } from "@/lib/auth";
import { setPasswordChanged } from "@/lib/repo/users";

/**
 * Gỡ cờ mustChangePassword sau khi better-auth đã đổi mật khẩu thành công.
 *
 * Phải nạp lại session ngay: cookie cache đang giữ mustChangePassword=true,
 * không refresh thì /dashboard sẽ đá ngược về đây thành vòng lặp.
 */
export async function clearMustChangePassword() {
  const ctx = await requireUser({ skipPasswordCheck: true });
  await setPasswordChanged(ctx);

  const auth = await getAuth();
  await auth.api.getSession({
    headers: await headers(),
    query: { disableCookieCache: true },
  });
}
