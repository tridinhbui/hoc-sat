"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";
import { importUsersAction, type AdminState } from "@/lib/actions/admin";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { CredentialsPanel } from "./credentials-panel";

const SAMPLE = `name,email,role,phone
Lê Bảo Ngọc,ngoc@hocsat.vn,student,0901234567
Trần Anh Minh,minh@hocsat.vn,ta,`;

export function ImportUsersForm() {
  const [state, action] = useActionState<AdminState, FormData>(importUsersAction, null);

  return (
    <Card>
      <CardTitle>Nhập nhiều tài khoản từ CSV</CardTitle>
      <CardDescription>
        Cột theo thứ tự <code>name,email,role,phone</code>. Thiếu vai trò thì mặc định là học sinh.
        Dòng nào lỗi sẽ bị bỏ qua và báo lại, các dòng còn lại vẫn được tạo.
      </CardDescription>

      <form action={action} className="mt-4 grid gap-3">
        <Textarea name="csv" rows={7} placeholder={SAMPLE} className="font-mono text-[13px]" />
        <div>
          <SubmitButton pendingText="Đang tạo...">
            <Upload /> Nhập danh sách
          </SubmitButton>
        </div>
      </form>

      {state?.error && (
        <div className="mt-3">
          <Alert>{state.error}</Alert>
        </div>
      )}
      {state?.ok && (
        <div className="mt-3">
          <Alert tone="success">{state.ok}</Alert>
        </div>
      )}

      {state?.failed && state.failed.length > 0 && (
        <ul className="text-muted mt-3 space-y-1 text-[13px]">
          {state.failed.map((f) => (
            <li key={f.line}>
              Dòng {f.line}: {f.message}
            </li>
          ))}
        </ul>
      )}

      {state?.created && <CredentialsPanel users={state.created} />}
    </Card>
  );
}
