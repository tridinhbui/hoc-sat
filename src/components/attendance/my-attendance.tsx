import { Check, Clock, FileCheck, X } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Cu } from "@/components/mascot/cu";
import { STATUS_LABEL, type AttendanceStatus } from "@/lib/attendance/types";

const ICON: Record<AttendanceStatus, { icon: typeof Check; tone: "success" | "accent" | "danger" | "info" }> = {
  present: { icon: Check, tone: "success" },
  late: { icon: Clock, tone: "accent" },
  absent: { icon: X, tone: "danger" },
  excused: { icon: FileCheck, tone: "info" },
};

export function MyAttendance({
  data,
}: {
  data: {
    rows: { sessionDate: string; title: string | null; status: string; note: string | null }[];
    total: number;
    attended: number;
    absent: number;
    rate: number | null;
  };
}) {
  if (data.total === 0) {
    return (
      <Card>
        <EmptyState
          mascot={<Cu pose="sleep" size={110} />}
          title="Chưa có buổi nào được điểm danh"
          description="Lịch sử đi học của bạn sẽ hiện ở đây."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">
              Tỉ lệ đi học
            </p>
            <p className="tnum font-display text-[32px] font-extrabold leading-none text-ink">
              {data.rate === null ? "—" : `${data.rate}%`}
            </p>
          </div>
          <p className="tnum text-sm text-muted">
            {data.attended}/{data.total} buổi
            {data.absent > 0 && ` · vắng ${data.absent}`}
          </p>
        </div>
      </Card>

      <Card className="p-0">
        <div className="p-5">
          <CardHeader className="mb-0">
            <CardTitle>Lịch sử</CardTitle>
          </CardHeader>
        </div>

        <ul className="border-t border-line">
          {data.rows.map((r, i) => {
            const s = r.status as AttendanceStatus;
            const Icon = ICON[s]?.icon ?? Check;
            return (
              <li
                key={`${r.sessionDate}-${i}`}
                className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="tnum block text-sm font-semibold text-ink">{r.sessionDate}</span>
                  {(r.title || r.note) && (
                    <span className="block truncate text-[13px] text-muted">
                      {[r.title, r.note].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
                <Badge tone={ICON[s]?.tone ?? "neutral"}>
                  <Icon /> {STATUS_LABEL[s] ?? r.status}
                </Badge>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
