import { requireClassRole } from "@/lib/auth/guard";
import { ANY_MEMBER } from "@/lib/auth/policy";
import { listMyGrades } from "@/lib/repo/assignments";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Cu } from "@/components/mascot/cu";
import { fmtDateTime } from "@/lib/utils/date";

export default async function Grades({ params }: PageProps<"/student/classes/[id]/grades">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, ANY_MEMBER);
  const rows = await listMyGrades(ctx);

  if (rows.length === 0) {
    return (
      <Card>
        <EmptyState
          mascot={<Cu pose="sleep" size={110} />}
          title="Chưa có điểm nào"
          description="Điểm hiện ra sau khi giáo viên trả bài."
        />
      </Card>
    );
  }

  const earned = rows.reduce((sum, r) => sum + (r.grade ?? 0), 0);
  const total = rows.reduce((sum, r) => sum + r.points, 0);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">
              Tổng điểm
            </p>
            <p className="tnum font-display text-[32px] font-extrabold leading-none text-ink">
              {earned}
              <span className="text-lg font-semibold text-muted">/{total}</span>
            </p>
          </div>
          <p className="tnum text-sm text-muted">{rows.length} bài đã trả</p>
        </div>
      </Card>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.assignmentId}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate">{r.title}</h3>
                <p className="text-[13px] text-muted">
                  {r.returnedAt ? `Trả bài ${fmtDateTime(r.returnedAt)}` : ""}
                </p>
                {r.isLate && (
                  <span className="mt-1 inline-block">
                    <Badge tone="danger">Nộp trễ</Badge>
                  </span>
                )}
              </div>
              <span className="tnum font-display shrink-0 text-2xl font-extrabold text-ink">
                {r.grade ?? "—"}
                <span className="text-base font-semibold text-muted">/{r.points}</span>
              </span>
            </div>

            {r.feedback && (
              <div className="mt-3 rounded-[var(--radius-md)] bg-primary-soft px-4 py-3">
                <p className="mb-1 text-[13px] font-semibold text-primary">Nhận xét</p>
                <p className="whitespace-pre-wrap text-body">{r.feedback}</p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
