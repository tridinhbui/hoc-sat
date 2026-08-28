"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Ban } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { fmtTime } from "@/lib/utils/date";
import { ATTEMPT_LABEL, PROCTOR_LABEL, type AttemptStatus, type ProctorEventType } from "@/lib/exam/types";
import { voidAttemptAction } from "@/lib/actions/exams";
import type { MonitorRow } from "@/lib/repo/exams";

const TONE: Record<string, "neutral" | "brand" | "success" | "danger" | "accent"> = {
  not_started: "neutral",
  in_progress: "brand",
  submitted: "success",
  auto_submitted: "accent",
  voided: "danger",
};

/**
 * Màn giám sát. Làm mới bằng polling 10 giây.
 *
 * Không dùng WebSocket vì OpenNext không cho export Durable Object của
 * mình; ở quy mô một lớp (~30 học sinh) polling là đủ. Xem PLAN.md §3.
 */
export function ExamMonitor({
  classId,
  examId,
  rows,
  canVoid,
}: {
  classId: string;
  examId: string;
  rows: MonitorRow[];
  canVoid: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [router]);

  const live = rows.filter((r) => r.status === "in_progress").length;
  const flagged = rows.filter((r) => r.violationCount > 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Đang thi</CardTitle>
            <CardDescription>
              {live}/{rows.length} học sinh đang làm bài · tự làm mới mỗi 10 giây
            </CardDescription>
          </div>
          {flagged.length > 0 && (
            <Badge tone="danger">
              <AlertTriangle /> {flagged.length} em có vi phạm
            </Badge>
          )}
        </CardHeader>
      </Card>

      <Card className="p-0">
        <ul>
          {rows.map((r) => (
            <li
              key={r.studentId}
              className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 last:border-0"
            >
              <Avatar name={r.name} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
                <span className="block truncate text-[13px] text-muted">
                  {r.currentModuleName ?? "—"}
                  {r.expiresAt && r.status === "in_progress"
                    ? ` · còn tới ${fmtTime(r.expiresAt)}`
                    : ""}
                </span>
              </span>

              {r.recentEvents.length > 0 && (
                <span className="hidden max-w-[220px] truncate text-[12px] text-muted sm:block">
                  {r.recentEvents
                    .map((e) => PROCTOR_LABEL[e.type as ProctorEventType] ?? e.type)
                    .join(" · ")}
                </span>
              )}

              {r.violationCount > 0 && (
                <Badge tone="danger">
                  <AlertTriangle /> {r.violationCount}
                </Badge>
              )}

              <Badge tone={TONE[r.status] ?? "neutral"}>
                {ATTEMPT_LABEL[r.status as AttemptStatus] ?? r.status}
              </Badge>

              <span className="tnum w-[52px] shrink-0 text-right font-display text-base font-extrabold text-ink">
                {r.totalScore ?? "—"}
              </span>

              {canVoid && r.attemptId && r.status !== "voided" && (
                <VoidButton classId={classId} examId={examId} attemptId={r.attemptId} name={r.name} />
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function VoidButton({
  classId,
  examId,
  attemptId,
  name,
}: {
  classId: string;
  examId: string;
  attemptId: string;
  name: string;
}) {
  const [state, action] = useActionState(voidAttemptAction, null);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Huỷ lượt thi của ${name}? Bài sẽ không được tính điểm.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="attemptId" value={attemptId} />
      {state?.error && <Alert>{state.error}</Alert>}
      <SubmitButton variant="ghost" size="sm" title={`Huỷ lượt thi của ${name}`}>
        <Ban />
      </SubmitButton>
    </form>
  );
}
