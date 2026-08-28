"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { createUserAction } from "@/lib/actions/admin";
import type { AdminState } from "@/lib/actions/admin";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { CredentialsPanel } from "./credentials-panel";

const ROLE_OPTIONS = [
  { value: "student", label: "Học sinh" },
  { value: "ta", label: "Trợ giảng" },
  { value: "teacher", label: "Giáo viên" },
  { value: "admin", label: "Quản trị" },
];

export function CreateUserForm() {
  const [state, action] = useActionState<AdminState, FormData>(createUserAction, null);

  return (
    <Card>
      <CardTitle>Tạo một tài khoản</CardTitle>
      <CardDescription>
        Hệ thống không cho tự đăng ký. Mọi tài khoản đều tạo từ đây.
      </CardDescription>

      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-body text-[13px] font-semibold">Họ tên</span>
          <Input name="name" required placeholder="Nguyễn Thị Lan" />
        </label>

        <label className="grid gap-1.5">
          <span className="text-body text-[13px] font-semibold">Email</span>
          <Input name="email" type="email" required placeholder="co.lan@hocsat.vn" />
        </label>

        <label className="grid gap-1.5">
          <span className="text-body text-[13px] font-semibold">Vai trò</span>
          <select
            name="role"
            defaultValue="student"
            className="border-line-strong bg-sunken text-ink h-11 rounded-[var(--radius-md)] border px-3 text-[15px]"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5">
          <span className="text-body text-[13px] font-semibold">Điện thoại (không bắt buộc)</span>
          <Input name="phone" placeholder="09xx xxx xxx" />
        </label>

        <div className="sm:col-span-2">
          <SubmitButton>
            <UserPlus /> Tạo tài khoản
          </SubmitButton>
        </div>
      </form>

      {state?.error && (
        <div className="mt-3">
          <Alert>{state.error}</Alert>
        </div>
      )}
      {state?.created && <CredentialsPanel users={state.created} />}
    </Card>
  );
}
