import Link from "next/link";
import { CalendarClock, FileCheck2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Cu } from "@/components/mascot/cu";
import { fmtDateTime, relativeDue } from "@/lib/utils/date";
import type { AssignmentListItem } from "@/lib/repo/assignments";

function DueBadge({ dueAt, overdue }: { dueAt: Date | null; overdue: boolean }) {
  if (!dueAt) return <Badge>Không hạn</Badge>;
  return (
    <Badge tone={overdue ? "danger" : "neutral"}>
      <CalendarClock />
      {overdue ? "Quá hạn" : relativeDue(dueAt)}
    </Badge>
  );
}

function StatusBadge({ status }: { status: "assigned" | "turned_in" | "returned" }) {
  if (status === "returned") return <Badge tone="success">Đã trả bài</Badge>;
  if (status === "turned_in") return <Badge tone="brand">Đã nộp</Badge>;
  return <Badge tone="accent">Chưa nộp</Badge>;
}

export function AssignmentList({
  items,
  basePath,
  canCreate,
}: {
  items: AssignmentListItem[];
  /** Ví dụ: /teacher/classes/abc/assignments */
  basePath: string;
  canCreate: boolean;
}) {
  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Link href={`${basePath}/new`}>
            <Button size="sm">
              <Plus /> Giao bài mới
            </Button>
          </Link>
        </div>
      )}

      {items.length === 0 && (
        <Card>
          <EmptyState
            mascot={<Cu pose="sleep" size={110} />}
            title="Chưa có bài tập nào"
            description={
              canCreate
                ? "Giao bài đầu tiên cho lớp, đặt hạn nộp rồi học sinh sẽ thấy ngay."
                : "Bài tập giáo viên giao sẽ xuất hiện ở đây."
            }
            action={
              canCreate ? (
                <Link href={`${basePath}/new`}>
                  <Button>
                    <Plus /> Giao bài mới
                  </Button>
                </Link>
              ) : undefined
            }
          />
        </Card>
      )}

      {items.map((a) => (
        <Card key={a.id} className="p-0">
          <Link href={`${basePath}/${a.id}`} className="rise block rounded-[var(--radius-lg)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  {!a.publishedAt && <Badge tone="accent">Nháp</Badge>}
                  <DueBadge dueAt={a.dueAt} overdue={a.overdue} />
                  {a.myStatus && <StatusBadge status={a.myStatus} />}
                </div>
                <h3 className="truncate">{a.title}</h3>
                <p className="text-[13px] text-muted">
                  {a.dueAt ? `Hạn ${fmtDateTime(a.dueAt)}` : "Không có hạn nộp"} · {a.points} điểm
                </p>
              </div>

              {a.totalStudents !== undefined ? (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-sunken px-3 py-1.5">
                  <FileCheck2 size={16} className="text-primary" />
                  <span className="tnum text-sm font-bold text-ink">
                    {a.turnedIn}/{a.totalStudents}
                  </span>
                  <span className="text-[13px] text-muted">đã nộp</span>
                </span>
              ) : a.myGrade != null ? (
                <span className="tnum font-display shrink-0 text-2xl font-extrabold text-ink">
                  {a.myGrade}
                  <span className="text-base font-semibold text-muted">/{a.points}</span>
                </span>
              ) : null}
            </div>
          </Link>
        </Card>
      ))}
    </div>
  );
}
