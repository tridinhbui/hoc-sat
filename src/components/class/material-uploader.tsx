"use client";

import { useActionState, useRef, useState } from "react";
import { Paperclip, X, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { createMaterialAction } from "@/lib/actions/content";

type Uploaded = { r2Key: string; fileName: string; mime: string | null; size: number | null };

const fmtSize = (n: number) =>
  n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`;

export function MaterialUploader({ classId }: { classId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<Uploaded[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [state, action] = useActionState(createMaterialAction, null);

  // File được đẩy thẳng lên R2 qua route handler trước, form chỉ gửi mô tả.
  // Server action có giới hạn body nhỏ, không nhét file vào đó được.
  async function upload(list: FileList) {
    setUploadError(undefined);
    setUploading(true);
    for (const file of Array.from(list)) {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("kind", "material");
      const res = await fetch(`/api/classes/${classId}/upload`, { method: "POST", body: fd });
      const json = (await res.json()) as Uploaded | { error: string };
      if (!res.ok) {
        setUploadError("error" in json ? json.error : "Tải file lên không được.");
        break;
      }
      setFiles((prev) => [...prev, json as Uploaded]);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

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
          <Textarea name="description" rows={2} maxLength={2000} placeholder="Vài dòng cho học sinh biết đây là gì" />
        </Field>

        {files.length > 0 && (
          <ul className="space-y-1.5">
            {files.map((f) => (
              <li
                key={f.r2Key}
                className="flex items-center gap-2 rounded-[var(--radius-md)] bg-sunken px-3 py-2"
              >
                <Paperclip size={16} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                  {f.fileName}
                </span>
                {f.size != null && (
                  <span className="tnum shrink-0 text-[12px] text-muted">{fmtSize(f.size)}</span>
                )}
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((x) => x.r2Key !== f.r2Key))}
                  className="shrink-0 text-muted hover:text-[#b32340]"
                  title="Bỏ file này"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {uploadError && <Alert>{uploadError}</Alert>}
        {state?.error && <Alert>{state.error}</Alert>}
        {state?.ok && <Alert tone="success">{state.ok}</Alert>}

        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => e.target.files?.length && upload(e.target.files)}
        />

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <Paperclip />}
            {uploading ? "Đang tải lên..." : "Đính kèm file"}
          </Button>
          <SubmitButton size="sm" disabled={uploading} pendingText="Đang đăng...">
            Đăng tài liệu
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}
