"use client";

import { useActionState } from "react";
import { Download, FileText, Send } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { fmtDateTime } from "@/lib/utils/date";
import { fmtSize } from "./file-picker";
import { gradeAction, returnAllAction } from "@/lib/actions/assignments";

export type SubmissionRow = {
  studentId: string;
  name: string;
  email: string;
  submissionId: string | null;
  status: "assigned" | "turned_in" | "returned";
  turnedInAt: Date | null;
  isLate: boolean | null;
  finalGrade: number | null;
  feedback: string | null;
  files: { id: string; fileName: string; size: number | null }[];
};

function GradeForm({
  classId,
  row,
  maxPoints,
}: {
  classId: string;
  row: SubmissionRow;
  maxPoints: number;
}) {
  const [state, action] = useActionState(gradeAction, null);

  return (
    <form action={action} className="space-y-3 border-t border-line px-4 py-4">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="submissionId" value={row.submissionId ?? ""} />

      {row.files.length > 0 && (
        <ul className="space-y-1.5">
          {row.files.map((f) => (
            <li key={f.id}>
              <a
                href={`/api/attachments/${f.id}`}
                className="rise flex items-center gap-2.5 rounded-[var(--radius-md)] border border-line bg-surface px-3 py-2.5"
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
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="w-[150px]">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">Điểm</span>
          <span className="flex items-center gap-2">
            <Input
              name="score"
              type="number"
              min={0}
              max={maxPoints}
              step="0.25"
              defaultValue={row.finalGrade ?? ""}
              placeholder="—"
              className="tnum text-center"
            />
            <span className="tnum shrink-0 text-sm text-muted">/ {maxPoints}</span>
          </span>
        </label>
      </div>

      <Textarea
        name="feedback"
        rows={2}
        maxLength={5000}
        defaultValue={row.feedback ?? ""}
        placeholder="Nhận xét cho học sinh..."
      />

      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.ok}</Alert>}

      <div className="flex flex-wrap justify-end gap-2">
        <SubmitButton name="intent" value="grade" variant="secondary" size="sm">
          Lưu điểm
        </SubmitButton>
        <SubmitButton name="intent" value="grade_and_return" size="sm" pendingText="Đang trả...">
          <Send /> Chấm và trả bài
        </SubmitButton>
      </div>
    </form>
  );
}

function ReturnAllForm({ classId, assignmentId }: { classId: string; assignmentId: string }) {
  const [state, action] = useActionState(returnAllAction, null);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="assignmentId" value={assignmentId} />
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.ok}</Alert>}
      <SubmitButton size="sm" variant="secondary" pendingText="Đang trả...">
        <Send /> Trả hết bài đã chấm
      </SubmitButton>
    </form>
  );
}

export function SubmissionTable({
  classId,
  assignmentId,
  maxPoints,
  rows,
}: {
  classId: string;
  assignmentId: string;
  maxPoints: number;
  rows: SubmissionRow[];
}) {
  const turnedIn = rows.filter((r) => r.status !== "assigned").length;

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <CardHeader className="mb-0">
          <div>
            <CardTitle>Bài nộp</CardTitle>
            <p className="tnum text-[13px] text-muted">
              {turnedIn}/{rows.length} học sinh đã nộp
            </p>
          </div>
        </CardHeader>
        <ReturnAllForm classId={classId} assignmentId={assignmentId} />
      </div>

      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted">Lớp chưa có học sinh nào.</p>
      ) : (
        <ul className="border-t border-line">
          {rows.map((r) => (
            <li key={r.studentId} className="border-b border-line last:border-0">
              {/* details/summary: mở đúng học sinh cần chấm, không cần state phía client */}
              <details>
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3 hover:bg-sunken">
                  <Avatar name={r.name} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {r.turnedInAt ? `Nộp ${fmtDateTime(r.turnedInAt)}` : "Chưa nộp"}
                    </span>
                  </span>

                  {r.isLate && <Badge tone="danger">Trễ</Badge>}
                  {r.status === "returned" ? (
                    <Badge tone="success">Đã trả</Badge>
                  ) : r.status === "turned_in" ? (
                    <Badge tone="brand">Chờ chấm</Badge>
                  ) : (
                    <Badge tone="accent">Chưa nộp</Badge>
                  )}

                  <span className="tnum w-[64px] shrink-0 text-right font-display text-lg font-extrabold text-ink">
                    {r.finalGrade ?? "—"}
                  </span>
                </summary>

                {r.submissionId ? (
                  <GradeForm classId={classId} row={r} maxPoints={maxPoints} />
                ) : (
                  <p className="border-t border-line px-5 py-4 text-sm text-muted">
                    Học sinh chưa nộp bài nên chưa chấm được.
                  </p>
                )}
              </details>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
