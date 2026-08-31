"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CalendarPlus, CalendarCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Field } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Cu } from "@/components/mascot/cu";
import { openSessionAction } from "@/lib/actions/attendance";
import type { SessionSummary } from "@/lib/attendance/types";

export function SessionList({
  classId,
  basePath,
  sessions,
  today,
  markedToday,
  totalStudents,
}: {
  classId: string;
  basePath: string;
  sessions: SessionSummary[];
  today: string;
  markedToday: boolean;
  totalStudents: number;
}) {
  const [state, action] = useActionState(openSessionAction, null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Điểm danh hôm nay</CardTitle>
            <CardDescription>
              {today}
              {markedToday ? ", đã điểm danh, bấm để sửa lại." : ", chưa điểm danh."}
            </CardDescription>
          </div>
          {markedToday && <Badge tone="success">Xong</Badge>}
        </CardHeader>

        <form action={action} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="sessionDate" value={today} />
          {state?.error && <Alert>{state.error}</Alert>}
          <SubmitButton pendingText="Đang mở...">
            <CalendarCheck /> {markedToday ? "Sửa điểm danh hôm nay" : "Điểm danh hôm nay"}
          </SubmitButton>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Mở buổi khác</CardTitle>
            <CardDescription>Điểm danh bù cho một buổi đã qua.</CardDescription>
          </div>
        </CardHeader>

        <form action={action} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="classId" value={classId} />
          <div className="w-[180px]">
            <Field label="Ngày">
              <Input type="date" name="sessionDate" defaultValue={today} required />
            </Field>
          </div>
          <div className="min-w-[200px] flex-1">
            <Field label="Ghi chú buổi" hint="Không bắt buộc">
              <Input name="title" maxLength={120} placeholder="Buổi 12, Ôn Algebra" />
            </Field>
          </div>
          <SubmitButton variant="secondary" pendingText="Đang mở...">
            <CalendarPlus /> Mở buổi
          </SubmitButton>
        </form>
      </Card>

      {sessions.length === 0 ? (
        <Card>
          <EmptyState
            mascot={<Cu pose="sleep" size={110} />}
            title="Chưa có buổi nào"
            description="Bấm Điểm danh hôm nay để mở buổi đầu tiên."
          />
        </Card>
      ) : (
        <Card className="p-0">
          <div className="p-5">
            <CardTitle>Lịch sử điểm danh</CardTitle>
            <CardDescription>{sessions.length} buổi. Bấm vào để sửa lại.</CardDescription>
          </div>

          <ul className="border-t border-line">
            {sessions.map((s) => (
              <li key={s.id} className="border-b border-line last:border-0">
                <Link
                  href={`${basePath}/${s.id}`}
                  className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-sunken"
                >
                  <span className="min-w-0 flex-1">
                    <span className="tnum block text-sm font-semibold text-ink">
                      {s.sessionDate}
                    </span>
                    {s.title && (
                      <span className="block truncate text-[13px] text-muted">{s.title}</span>
                    )}
                  </span>

                  {s.marked === 0 ? (
                    <Badge tone="accent">Chưa điểm danh</Badge>
                  ) : (
                    <>
                      {s.present > 0 && <Badge tone="success">{s.present} có mặt</Badge>}
                      {s.late > 0 && <Badge tone="accent">{s.late} trễ</Badge>}
                      {s.absent > 0 && <Badge tone="danger">{s.absent} vắng</Badge>}
                      {s.excused > 0 && <Badge tone="info">{s.excused} có phép</Badge>}
                    </>
                  )}

                  <span className="tnum w-[52px] shrink-0 text-right text-[13px] text-muted">
                    {s.marked}/{totalStudents}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
