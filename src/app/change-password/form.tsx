"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { changePassword } from "@/lib/auth/client";
import { clearMustChangePassword } from "./actions";

export function ChangePasswordForm({ first }: { first: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);

    const form = new FormData(e.currentTarget);
    const next = String(form.get("next"));
    if (next.length < 8) return setError("Mật khẩu cần ít nhất 8 ký tự.");
    if (next !== String(form.get("confirm"))) return setError("Hai ô mật khẩu chưa khớp nhau.");

    setLoading(true);
    const res = await changePassword({
      currentPassword: String(form.get("current")),
      newPassword: next,
      revokeOtherSessions: true,
    });

    if (res.error) {
      setLoading(false);
      return setError("Mật khẩu hiện tại chưa đúng.");
    }

    await clearMustChangePassword();
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={first ? "Mật khẩu tạm (trong email)" : "Mật khẩu hiện tại"}>
          <Input name="current" type="password" required autoComplete="current-password" />
        </Field>
        <Field label="Mật khẩu mới" hint="Ít nhất 8 ký tự">
          <Input name="next" type="password" required autoComplete="new-password" />
        </Field>
        <Field label="Nhập lại mật khẩu mới">
          <Input name="confirm" type="password" required autoComplete="new-password" />
        </Field>

        {error && (
          <p className="rounded-[var(--radius-md)] bg-danger-soft px-3 py-2 text-[13px] text-[#b32340]">
            {error}
          </p>
        )}

        <Button type="submit" block disabled={loading}>
          {loading ? "Đang lưu..." : "Lưu mật khẩu"}
        </Button>
      </form>
    </Card>
  );
}
