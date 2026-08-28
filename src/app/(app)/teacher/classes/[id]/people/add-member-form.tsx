"use client";

import { useActionState, useRef } from "react";
import { UserPlus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { addMemberAction } from "@/lib/actions/classes";

export function AddMemberForm({ classId }: { classId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(addMemberAction, null);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Thêm thành viên</CardTitle>
          <CardDescription>
            Tài khoản phải do trung tâm tạo trước. Học sinh cũng có thể tự vào bằng mã lớp.
          </CardDescription>
        </div>
      </CardHeader>

      <form
        ref={formRef}
        action={async (fd) => {
          await action(fd);
          formRef.current?.reset();
        }}
        className="space-y-4"
      >
        <input type="hidden" name="classId" value={classId} />

        <Field label="Email">
          <Input name="email" type="email" required placeholder="nguoi.can.them@hocsat.vn" />
        </Field>

        <Field label="Vai trò trong lớp">
          <select
            name="role"
            defaultValue="student"
            className="h-11 w-full rounded-[var(--radius-md)] border border-transparent bg-sunken px-4 text-[15px] text-ink focus:border-line-strong focus:bg-surface"
          >
            <option value="student">Học sinh</option>
            <option value="ta">Trợ giảng</option>
          </select>
        </Field>

        {state?.error && <Alert>{state.error}</Alert>}
        {state?.ok && <Alert tone="success">{state.ok}</Alert>}

        <SubmitButton block pendingText="Đang thêm...">
          <UserPlus /> Thêm vào lớp
        </SubmitButton>
      </form>
    </Card>
  );
}
