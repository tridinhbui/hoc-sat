import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guard";
import { Cu } from "@/components/mascot/cu";
import { ChangePasswordForm } from "./form";

export const metadata: Metadata = { title: "Đổi mật khẩu" };

export default async function ChangePasswordPage() {
  // skipPasswordCheck: chính trang này là nơi gỡ cờ mustChangePassword,
  // không được để requireUser đá vòng lại đây.
  const { user } = await requireUser({ skipPasswordCheck: true });

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="fade-up w-full max-w-[400px]">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <Cu pose="wave" size={96} />
          <h1 className="font-display text-[24px] font-extrabold text-ink">
            {user.mustChangePassword ? "Đặt mật khẩu mới nhé" : "Đổi mật khẩu"}
          </h1>
          {user.mustChangePassword && (
            <p className="text-sm text-muted">
              Đây là lần đăng nhập đầu tiên — đặt mật khẩu riêng của bạn trước khi vào lớp.
            </p>
          )}
        </div>
        <ChangePasswordForm first={user.mustChangePassword} />
      </div>
    </main>
  );
}
