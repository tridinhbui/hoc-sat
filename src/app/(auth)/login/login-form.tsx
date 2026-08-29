"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { signIn } from "@/lib/auth/client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await signIn.email({
      email: String(form.get("email")).trim().toLowerCase(),
      password: String(form.get("password")),
    });

    setLoading(false);
    if (res.error) {
      // Không phân biệt "sai email" với "sai mật khẩu" — tránh dò tài khoản.
      setError("Email hoặc mật khẩu chưa đúng. Thử lại giúp mình nhé.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="rounded-[var(--radius-xl)] border-line/80 bg-surface p-6 shadow-soft">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email">
          <Input name="email" type="email" required autoComplete="email" placeholder="ban@email.com" />
        </Field>

        <Field label="Mật khẩu">
          <Input name="password" type="password" required autoComplete="current-password" placeholder="••••••••" />
        </Field>

        {error && (
          <p className="rounded-[var(--radius-md)] bg-danger-soft px-3 py-2 text-[13px] font-semibold text-danger">
            {error}
          </p>
        )}

        <Button type="submit" block disabled={loading} className="rounded-full bg-primary py-2.5 font-bold shadow-xs hover:bg-primary-hover">
          {loading ? "Đang vào..." : "Đăng nhập"}
        </Button>

        <p className="text-center text-xs font-medium text-muted">
          Tài khoản do trung tâm cấp. Quên mật khẩu? Nhắn giáo viên hoặc admin nhé.
        </p>
      </form>
    </Card>
  );
}
