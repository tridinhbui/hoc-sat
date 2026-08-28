import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { StudentAttendance } from "@/lib/attendance/types";

/** Dưới 75% là mức trung tâm nên gọi phụ huynh. */
const AT_RISK = 75;

export function AttendanceSummary({ rows }: { rows: StudentAttendance[] }) {
  const withData = rows.filter((r) => r.total > 0);
  if (withData.length === 0) return null;

  const atRisk = withData.filter((r) => r.rate !== null && r.rate < AT_RISK);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Chuyên cần</CardTitle>
          <CardDescription>
            Tỉ lệ có mặt, xếp thấp nhất lên đầu. Buổi nghỉ có phép không tính vào mẫu số.
          </CardDescription>
        </div>
        {atRisk.length > 0 && <Badge tone="danger">{atRisk.length} em cần chú ý</Badge>}
      </CardHeader>

      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.studentId} className="flex items-center gap-3">
            <Avatar name={r.name} size={32} />
            <span className="min-w-0 flex-1">
              <span className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-ink">{r.name}</span>
                <span className="tnum shrink-0 text-[13px] text-muted">
                  {r.total === 0
                    ? "chưa có buổi nào"
                    : `${r.present + r.late}/${r.total - r.excused} buổi${
                        r.excused ? ` · ${r.excused} có phép` : ""
                      }`}
                </span>
              </span>
              <span className="block h-2 overflow-hidden rounded-full bg-sunken">
                <span
                  className={cn(
                    "block h-full rounded-full transition-[width] duration-500",
                    r.rate === null && "bg-line-strong",
                    r.rate !== null && r.rate >= 90 && "bg-success",
                    r.rate !== null && r.rate >= AT_RISK && r.rate < 90 && "bg-accent",
                    r.rate !== null && r.rate < AT_RISK && "bg-danger",
                  )}
                  style={{ width: `${r.rate ?? 0}%` }}
                />
              </span>
            </span>
            <span className="tnum w-[46px] shrink-0 text-right text-sm font-bold text-ink">
              {r.rate === null ? "—" : `${r.rate}%`}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
