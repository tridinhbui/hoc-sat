import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/guard";
import { Landing } from "@/components/landing/landing";

/**
 * Người đã đăng nhập không có việc gì ở trang giới thiệu — đẩy thẳng vào
 * dashboard như trước. Người chưa đăng nhập thì thấy landing thay vì bị
 * ném ngay vào ô nhập mật khẩu.
 */
export default async function Home() {
  if (await getSessionUser()) redirect("/dashboard");
  return <Landing />;
}
