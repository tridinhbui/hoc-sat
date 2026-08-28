"use client";

import { useActionState, useState } from "react";
import { Check, Clock, FileCheck, X, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { deleteSessionAction, markSessionAction } from "@/lib/actions/attendance";
import { STATUS_LABEL, type AttendanceStatus } from "@/lib/attendance/types";
import type { RosterRow } from "@/lib/attendance/types";

const OPTIONS: {
  value: AttendanceStatus;
  icon: typeof Check;
  active: string;
}[] = [
  { value: "present", icon: Check, active: "bg-success text-white" },
  { value: "late", icon: Clock, active: "bg-accent text-ink" },
  { value: "absent", icon: X, active: "bg-danger text-white" },
  { value: "excused", icon: FileCheck, active: "bg-info text-white" },
];

/**
 * Bảng điểm danh một buổi.
 *
 * Mặc định cả lớp "có mặt" — giáo viên chỉ phải bấm vào người vắng. Điểm
 * danh 30 học sinh mà phải chọn từng người thì không ai dùng.
 */
export function SessionSheet({
  classId,
  sessionId,
  sessionDate,
  title,
  roster,
  canDelete,
}: {
  classId: string;
  sessionId: string;
  sessionDate: string;
  title: string | null;
  roster: RosterRow[];
  canDelete: boolean;
}) {
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(roster.map((r) => [r.studentId, r.status ?? "present"])),
  );
  const [state, action] = useActionState(markSessionAction, null);

  const tally = OPTIONS.map((o) => ({
    ...o,
    n: Object.values(marks).filter((m) => m === o.value).length,
  }));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="sessionId" value={sessionId} />

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="tnum">{sessionDate}</CardTitle>
            <CardDescription>{title || "Buổi học"}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tally.map((t) => (
              <span
                key={t.value}
                className="tnum rounded-full bg-sunken px-2.5 py-1 text-[12px] font-semibold text-body"
              >
                {STATUS_LABEL[t.value]} {t.n}
              </span>
            ))}
          </div>
        </CardHeader>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              setMarks(Object.fromEntries(roster.map((r) => [r.studentId, "present" as const])))
            }
          >
            <Check /> Đánh dấu cả lớp có mặt
          </Button>
        </div>
      </Card>

      {roster.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Lớp chưa có học sinh nào.</p>
        </Card>
      ) : (
        <Card className="p-0">
          <ul>
            {roster.map((r) => {
              const current = marks[r.studentId] ?? "present";
              return (
                <li
                  key={r.studentId}
                  className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 last:border-0"
                >
                  <Avatar name={r.name} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
                    <span className="block truncate text-[13px] text-muted">{r.email}</span>
                  </span>

                  <input type="hidden" name={`status_${r.studentId}`} value={current} />

                  <div className="flex gap-1" role="group" aria-label={`Điểm danh ${r.name}`}>
                    {OPTIONS.map((o) => {
                      const on = current === o.value;
                      const Icon = o.icon;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          aria-pressed={on}
                          title={STATUS_LABEL[o.value]}
                          onClick={() =>
                            setMarks((prev) => ({ ...prev, [r.studentId]: o.value }))
                          }
                          className={cn(
                            "grid size-9 place-items-center rounded-full transition-colors",
                            on ? o.active : "bg-sunken text-muted hover:bg-primary-soft",
                          )}
                        >
                          <Icon size={17} strokeWidth={2.5} />
                          <span className="sr-only">{STATUS_LABEL[o.value]}</span>
                        </button>
                      );
                    })}
                  </div>

                  <Input
                    name={`note_${r.studentId}`}
                    defaultValue={r.note ?? ""}
                    placeholder="Ghi chú"
                    maxLength={200}
                    className="h-9 w-full text-[13px] sm:w-[180px]"
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.ok}</Alert>}

      <div className="flex flex-wrap justify-between gap-2">
        {canDelete ? (
          <button
            type="submit"
            formAction={deleteSessionAction}
            formNoValidate
            onClick={(e) => {
              if (!confirm("Xoá buổi điểm danh này? Toàn bộ ghi nhận của buổi sẽ mất.")) {
                e.preventDefault();
              }
            }}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-danger-soft hover:text-[#b32340]"
          >
            <Trash2 size={17} /> Xoá buổi
          </button>
        ) : (
          <span />
        )}
        <SubmitButton pendingText="Đang lưu...">Lưu điểm danh</SubmitButton>
      </div>
    </form>
  );
}
