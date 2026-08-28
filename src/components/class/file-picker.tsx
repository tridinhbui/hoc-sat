"use client";

import { useRef, useState } from "react";
import { Paperclip, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export type Uploaded = {
  r2Key: string;
  fileName: string;
  mime: string | null;
  size: number | null;
};

export const fmtSize = (n: number) =>
  n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`;

/**
 * Chọn file → đẩy thẳng lên R2 qua route handler → giữ lại mô tả để form
 * submit kèm. Server action có giới hạn body nhỏ nên không nhét file vào đó.
 */
export function FilePicker({
  classId,
  kind,
  files,
  onChange,
  onBusyChange,
  label = "Đính kèm file",
}: {
  classId: string;
  kind: "material" | "assignment" | "submission" | "question";
  files: Uploaded[];
  onChange: (files: Uploaded[]) => void;
  onBusyChange?: (busy: boolean) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  function setBusyBoth(v: boolean) {
    setBusy(v);
    onBusyChange?.(v);
  }

  async function upload(list: FileList) {
    setError(undefined);
    setBusyBoth(true);
    const added: Uploaded[] = [];
    for (const file of Array.from(list)) {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(`/api/classes/${classId}/upload?kind=${kind}`, {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as Uploaded | { error: string };
      if (!res.ok) {
        setError("error" in json ? json.error : "Tải file lên không được.");
        break;
      }
      added.push(json as Uploaded);
    }
    onChange([...files, ...added]);
    setBusyBoth(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
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
                onClick={() => onChange(files.filter((x) => x.r2Key !== f.r2Key))}
                className="shrink-0 text-muted hover:text-[#b32340]"
                title="Bỏ file này"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <Alert>{error}</Alert>}

      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => e.target.files?.length && upload(e.target.files)}
      />

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Paperclip />}
        {busy ? "Đang tải lên..." : label}
      </Button>
    </div>
  );
}
