"use client";

import { useActionState, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { FilePicker, type Uploaded } from "./file-picker";
import { createMaterialAction } from "@/lib/actions/content";

export function MaterialUploader({ classId }: { classId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [files, setFiles] = useState<Uploaded[]>([]);
  const [busy, setBusy] = useState(false);
  const [state, action] = useActionState(createMaterialAction, null);

  return (
    <Card>
      <form
        ref={formRef}
        action={async (fd) => {
          fd.set("files", JSON.stringify(files));
          await action(fd);
          formRef.current?.reset();
          setFiles([]);
        }}
        className="space-y-3"
      >
        <input type="hidden" name="classId" value={classId} />

        <Field label="Tiêu đề">
          <Input name="title" required maxLength={200} placeholder="Ví dụ: Bộ đề Reading tuần 3" />
        </Field>

        <Field label="Mô tả" hint="Không bắt buộc">
          <Textarea
            name="description"
            rows={2}
            maxLength={2000}
            placeholder="Vài dòng cho học sinh biết đây là gì"
          />
        </Field>

        <FilePicker
          classId={classId}
          kind="material"
          files={files}
          onChange={setFiles}
          onBusyChange={setBusy}
        />

        {state?.error && <Alert>{state.error}</Alert>}
        {state?.ok && <Alert tone="success">{state.ok}</Alert>}

        <div className="flex justify-end">
          <SubmitButton size="sm" disabled={busy} pendingText="Đang đăng...">
            Đăng tài liệu
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}
