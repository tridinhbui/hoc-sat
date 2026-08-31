"use client";

import { useMemo, useState } from "react";
import { Download, ArrowUpDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils/cn";
import type { StudentReport } from "@/lib/reports/types";
import { FLAG_LABEL, flagOf, overallScore, pct } from "@/lib/reports/types";
import { reportFileName, reportToCsv } from "@/lib/reports/csv";

const FLAG_TONE = { ok: "success", watch: "accent", risk: "danger" } as const;

type SortKey = "name" | "overall" | "assignment" | "exam" | "attendance";

const VALUE: Record<SortKey, (r: StudentReport) => number | string | null> = {
  name: (r) => r.name,
  overall: overallScore,
  assignment: (r) => pct(r.assignmentScore, r.assignmentMax),
  exam: (r) => pct(r.examScore, r.examMax),
  attendance: (r) => r.attendanceRate,
};

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "overall", label: "Tổng kết" },
  { key: "assignment", label: "Bài tập" },
  { key: "exam", label: "Thi" },
  { key: "attendance", label: "Chuyên cần" },
];

function Pct({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted">—</span>;
  return (
    <span
      className={cn(
        "tnum font-bold",
        value >= 85 && "text-[#199647]",
        value >= 60 && value < 85 && "text-ink",
        value < 60 && "text-[#4c1979]",
      )}
    >
      {value}%
    </span>
  );
}

export function ReportTable({
  rows,
  className,
  today,
}: {
  rows: StudentReport[];
  className: string;
  today: string;
}) {
  const [sort, setSort] = useState<SortKey>("overall");

  const sorted = useMemo(() => {
    const get = VALUE[sort];
    return [...rows].sort((a, b) => {
      if (sort === "name") return String(get(a)).localeCompare(String(get(b)), "vi");
      // Chưa có dữ liệu xuống cuối bảng, không lên đầu như số 0.
      const x = get(a) as number | null;
      const y = get(b) as number | null;
      if (x === null && y === null) return a.name.localeCompare(b.name, "vi");
      if (x === null) return 1;
      if (y === null) return -1;
      return x - y;
    });
  }, [rows, sort]);

  function download() {
    const blob = new Blob([reportToCsv(sorted)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = reportFileName(className, today);
    a.click();
    URL.revokeObjectURL(url);
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Lớp chưa có học sinh"
        description="Báo cáo sẽ hiện khi có học sinh vào lớp bằng mã lớp."
      />
    );
  }

  const risk = rows.filter((r) => flagOf(r) === "risk");

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Báo cáo tiến độ</CardTitle>
          <CardDescription>
            Chỉ tính điểm đã chốt: bài tập đã trả và bài thi đã nộp. Tổng kết = bài tập 40% ·
            thi 40% · chuyên cần 20%.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {risk.length > 0 && <Badge tone="danger">{risk.length} em cần can thiệp</Badge>}
          <Button variant="secondary" size="sm" onClick={download}>
            <Download /> Xuất CSV
          </Button>
        </div>
      </CardHeader>

      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="py-2 pr-3 font-semibold text-muted">
                <button
                  type="button"
                  onClick={() => setSort("name")}
                  className="inline-flex items-center gap-1 hover:text-ink"
                >
                  Học sinh <ArrowUpDown className="size-3.5" />
                </button>
              </th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="py-2 px-3 text-right font-semibold text-muted">
                  <button
                    type="button"
                    onClick={() => setSort(c.key)}
                    className={cn(
                      "inline-flex items-center gap-1 hover:text-ink",
                      sort === c.key && "text-ink",
                    )}
                  >
                    {c.label} <ArrowUpDown className="size-3.5" />
                  </button>
                </th>
              ))}
              <th className="py-2 pl-3 text-right font-semibold text-muted">Trạng thái</th>
            </tr>
          </thead>

          <tbody>
            {sorted.map((r) => {
              const flag = flagOf(r);
              const missing = r.assignmentsAssigned - r.assignmentsTurnedIn;

              return (
                <tr key={r.studentId} className="border-b border-line last:border-0">
                  <td className="py-3 pr-3">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={r.name} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{r.name}</span>
                        <span className="block text-[13px] text-muted">
                          {r.assignmentsGraded}/{r.assignmentsAssigned} bài đã chấm
                          {missing > 0 && ` · thiếu ${missing}`}
                          {r.assignmentsLate > 0 && ` · trễ ${r.assignmentsLate}`}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 text-right">
                    <Pct value={overallScore(r)} />
                  </td>
                  <td className="px-3 text-right">
                    <Pct value={pct(r.assignmentScore, r.assignmentMax)} />
                  </td>
                  <td className="px-3 text-right">
                    <Pct value={pct(r.examScore, r.examMax)} />
                    {r.examsTaken > 0 && (
                      <span className="ml-1 text-[12px] text-muted">({r.examsTaken})</span>
                    )}
                  </td>
                  <td className="px-3 text-right">
                    <Pct value={r.attendanceRate} />
                    {r.sessionsCounted > 0 && (
                      <span className="ml-1 text-[12px] text-muted">({r.sessionsCounted})</span>
                    )}
                  </td>
                  <td className="pl-3 text-right">
                    <Badge tone={FLAG_TONE[flag]}>{FLAG_LABEL[flag]}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
