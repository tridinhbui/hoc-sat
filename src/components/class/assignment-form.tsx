"use client";

import { useActionState, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { FilePicker, type Uploaded } from "./file-picker";
import { createAssignmentAction } from "@/lib/actions/assignments";

export function AssignmentForm({ classId }: { classId: string }) {
  const [files, setFiles] = useState<Uploaded[]>([]);
  const [busy, setBusy] = useState(false);
  const [state, action] = useActionState(createAssignmentAction, null);

  return (
    <Card className="mx-auto max-w-[640px]">
      <form
        action={(fd) => {
          fd.set("files", JSON.stringify(files));
          return action(fd);
        }}
        className="space-y-4"
      >
        <input type="hidden" name="classId" value={classId} />

        <Field label="Tiêu đề">
          <Input name="title" required autoFocus maxLength={200} placeholder="Bài tập Reading tuần 3" />
        </Field>

        <Field label="Hướng dẫn" hint="Không bắt buộc">
          <Textarea
            name="description"
            rows={4}
            maxLength={5000}
            placeholder="Yêu cầu, cách nộp, lưu ý cho học sinh..."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Hạn nộp" hint="Giờ Việt Nam. Bỏ trống nếu không đặt hạn.">
            <Input name="dueAt" type="datetime-local" />
          </Field>
          <Field label="Điểm tối đa">
            <Input name="points" type="number" min={1} step={1} defaultValue={100} required />
          </Field>
        </div>

        <label className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-sunken px-3.5 py-3">
          <input
            type="checkbox"
            name="allowLate"
            defaultChecked
            className="mt-0.5 size-4 accent-[var(--color-primary)]"
          />
          <span>
            <span className="block text-sm font-semibold text-ink">Cho nộp trễ</span>
            <span className="block text-[13px] text-muted">
              Bài nộp sau hạn vẫn nhận, nhưng được đánh dấu trễ để giáo viên biết.
            </span>
          </span>
        </label>

        <FilePicker
          classId={classId}
          kind="assignment"
          files={files}
          onChange={setFiles}
          onBusyChange={setBusy}
          label="Đính kèm đề bài"
        />

        {state?.error && <Alert>{state.error}</Alert>}

        <div className="flex flex-wrap justify-end gap-2">
          <SubmitButton
            name="intent"
            value="draft"
            variant="secondary"
            disabled={busy}
            pendingText="Đang lưu..."
          >
            Lưu nháp
          </SubmitButton>
          <SubmitButton name="intent" value="publish" disabled={busy} pendingText="Đang giao...">
            Giao cho lớp
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}
