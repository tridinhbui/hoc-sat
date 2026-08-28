"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Download, FileText, Undo2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { FilePicker, fmtSize, type Uploaded } from "./file-picker";
import { fmtDateTime } from "@/lib/utils/date";
import { turnInAction, unsubmitAction } from "@/lib/actions/assignments";

export type MySubmission = {
  status: "assigned" | "turned_in" | "returned";
  turnedInAt: Date | null;
  isLate: boolean;
  finalGrade: number | null;
  feedback: string | null;
  files: { id: string; fileName: string; size: number | null }[];
};

export function SubmitPanel({
  classId,
  assignmentId,
  maxPoints,
  submission,
  overdue,
  allowLate,
}: {
  classId: string;
  assignmentId: string;
  maxPoints: number;
  submission: MySubmission | null;
  overdue: boolean;
  allowLate: boolean;
}) {
  const [files, setFiles] = useState<Uploaded[]>([]);
  const [busy, setBusy] = useState(false);
  const [turnInState, turnIn] = useActionState(turnInAction, null);
  const [undoState, undo] = useActionState(unsubmitAction, null);

  const status = submission?.status ?? "assigned";
  const locked = overdue && !allowLate && status === "assigned";

  // Đã trả bài: chỉ xem điểm và nhận xét, không nộp lại được nữa.
  if (status === "returned") {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Bài của bạn</CardTitle>
            <Badge tone="success">
              <CheckCircle2 /> Đã trả bài
            </Badge>
          </div>
          <span className="tnum font-display text-3xl font-extrabold text-ink">
            {submission?.finalGrade ?? "—"}
            <span className="text-lg font-semibold text-muted">/{maxPoints}</span>
          </span>
        </CardHeader>

        {submission?.feedback && (
          <div className="mb-3 rounded-[var(--radius-md)] bg-primary-soft px-4 py-3">
            <p className="mb-1 text-[13px] font-semibold text-primary">Nhận xét của giáo viên</p>
            <p className="whitespace-pre-wrap text-body">{submission.feedback}</p>
          </div>
        )}

        <FileLinks files={submission?.files ?? []} />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Bài của bạn</CardTitle>
          {status === "turned_in" && submission?.turnedInAt && (
            <p className="text-[13px] text-muted">Đã nộp lúc {fmtDateTime(submission.turnedInAt)}</p>
          )}
        </div>
        {status === "turned_in" ? (
          <Badge tone="brand">Đã nộp</Badge>
        ) : (
          <Badge tone="accent">Chưa nộp</Badge>
        )}
      </CardHeader>

      {submission?.isLate && (
        <div className="mb-3">
          <Badge tone="danger">Nộp trễ hạn</Badge>
        </div>
      )}

      {status === "turned_in" && <FileLinks files={submission?.files ?? []} />}

      {locked ? (
        <Alert>Bài này đã quá hạn và không nhận nộp trễ. Liên hệ giáo viên nhé.</Alert>
      ) : (
        <div className="mt-3 space-y-3">
          {overdue && status === "assigned" && (
            <Alert>Đã quá hạn — bài nộp sẽ được đánh dấu là trễ.</Alert>
          )}

          <form
            action={async (fd) => {
              fd.set("files", JSON.stringify(files));
              await turnIn(fd);
              // Nộp xong thì dọn ô chọn file, không thì file vừa nộp hiện
              // hai lần: một ở danh sách đã nộp, một ở ô đang chờ.
              setFiles([]);
            }}
            className="space-y-3"
          >
            <input type="hidden" name="classId" value={classId} />
            <input type="hidden" name="assignmentId" value={assignmentId} />

            <FilePicker
              classId={classId}
              kind="submission"
              files={files}
              onChange={setFiles}
              onBusyChange={setBusy}
              label={status === "turned_in" ? "Chọn file để nộp lại" : "Đính kèm bài làm"}
            />

            {turnInState?.error && <Alert>{turnInState.error}</Alert>}
            {turnInState?.ok && <Alert tone="success">{turnInState.ok}</Alert>}
            {undoState?.ok && <Alert tone="success">{undoState.ok}</Alert>}
            {undoState?.error && <Alert>{undoState.error}</Alert>}

            <div className="flex flex-wrap justify-end gap-2">
              {status === "turned_in" && (
                <SubmitButton variant="ghost" size="sm" formAction={undo} pendingText="Đang huỷ...">
                  <Undo2 /> Huỷ nộp
                </SubmitButton>
              )}
              <SubmitButton
                size="sm"
                disabled={busy || files.length === 0}
                pendingText="Đang nộp..."
              >
                {status === "turned_in" ? "Nộp lại" : "Nộp bài"}
              </SubmitButton>
            </div>
          </form>
        </div>
      )}
    </Card>
  );
}

function FileLinks({ files }: { files: { id: string; fileName: string; size: number | null }[] }) {
  if (files.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {files.map((f) => (
        <li key={f.id}>
          <a
            href={`/api/attachments/${f.id}`}
            className="rise flex items-center gap-2.5 rounded-[var(--radius-md)] border border-line px-3 py-2.5"
          >
            <FileText size={17} className="shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">
              {f.fileName}
            </span>
            {f.size != null && (
              <span className="tnum shrink-0 text-[12px] text-muted">{fmtSize(f.size)}</span>
            )}
            <Download size={16} className="shrink-0 text-muted" />
          </a>
        </li>
      ))}
    </ul>
  );
}
