"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { regenerateCodeAction, updateClassAction } from "@/lib/actions/classes";

export function SettingsForm({
  classId,
  name,
  scheduleNote,
  archived,
  code,
}: {
  classId: string;
  name: string;
  scheduleNote: string;
  archived: boolean;
  code: string;
}) {
  const [state, action] = useActionState(updateClassAction, null);
  const [codeState, codeAction] = useActionState(regenerateCodeAction, null);

  return (
    <div className="bento">
      <Card className="col-span-7">
        <CardHeader>
          <CardTitle>Thông tin lớp</CardTitle>
        </CardHeader>

        <form action={action} className="space-y-4">
          <input type="hidden" name="classId" value={classId} />

          <Field label="Tên lớp">
            <Input name="name" defaultValue={name} required maxLength={120} />
          </Field>

          <Field label="Lịch học">
            <Input name="scheduleNote" defaultValue={scheduleNote} maxLength={200} />
          </Field>

          <label className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-sunken px-3.5 py-3">
            <input
              type="checkbox"
              name="archived"
              defaultChecked={archived}
              className="mt-0.5 size-4 accent-[var(--color-primary)]"
            />
            <span>
              <span className="block text-sm font-semibold text-ink">Lưu trữ lớp</span>
              <span className="block text-[13px] text-muted">
                Lớp lưu trữ không nhận học sinh mới và không hiện trong danh sách đang dạy.
                Dữ liệu vẫn còn nguyên.
              </span>
            </span>
          </label>

          {state?.error && <Alert>{state.error}</Alert>}
          {state?.ok && <Alert tone="success">{state.ok}</Alert>}

          <SubmitButton>Lưu thay đổi</SubmitButton>
        </form>
      </Card>

      <Card className="col-span-5">
        <CardHeader>
          <div>
            <CardTitle>Mã lớp</CardTitle>
            <CardDescription>
              Đổi mã khi mã cũ bị lộ ra ngoài. Học sinh đã ở trong lớp không bị ảnh hưởng.
            </CardDescription>
          </div>
        </CardHeader>

        <p className="tnum font-display mb-4 text-2xl font-extrabold tracking-[0.15em] text-ink">
          {code}
        </p>

        <form
          action={codeAction}
          onSubmit={(e) => {
            if (!confirm("Đổi mã lớp? Mã cũ sẽ không dùng được nữa.")) e.preventDefault();
          }}
          className="space-y-3"
        >
          <input type="hidden" name="classId" value={classId} />
          {codeState?.error && <Alert>{codeState.error}</Alert>}
          {codeState?.ok && <Alert tone="success">{codeState.ok}</Alert>}
          <SubmitButton variant="secondary" size="sm" pendingText="Đang đổi...">
            <RefreshCw /> Đổi mã lớp
          </SubmitButton>
        </form>
      </Card>
    </div>
  );
}
