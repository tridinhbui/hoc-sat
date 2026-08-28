import { Check, X, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Cu } from "@/components/mascot/cu";
import { cn } from "@/lib/utils/cn";
import type { HeatmapRow, QuestionStat } from "@/lib/repo/questions";
import { summarizeByDomain } from "@/lib/repo/questions";

const pct = (correct: number, total: number) =>
  total === 0 ? null : Math.round((correct / total) * 100);

/** Xanh khi lớp làm tốt, đỏ khi vướng — ngưỡng theo tỉ lệ đúng. */
function rateTone(p: number | null) {
  if (p === null) return "neutral" as const;
  if (p >= 80) return "success" as const;
  if (p >= 50) return "accent" as const;
  return "danger" as const;
}

export function QuizAnalytics({
  stats,
  heatmap,
}: {
  stats: QuestionStat[];
  heatmap: HeatmapRow[];
}) {
  if (stats.length === 0) {
    return (
      <Card>
        <EmptyState
          mascot={<Cu pose="magnify" size={110} />}
          title="Chưa có câu hỏi nào"
          description="Thêm câu hỏi ở tab soạn đề, thống kê sẽ hiện ra sau khi học sinh nộp."
        />
      </Card>
    );
  }

  const submitted = heatmap.filter((h) => h.status !== "assigned");
  const hardest = [...stats]
    .filter((s) => s.answered > 0)
    .sort((a, b) => a.correct / a.answered - b.correct / b.answered)
    .slice(0, 5);
  const domains = summarizeByDomain(stats);

  return (
    <div className="space-y-4">
      {submitted.length === 0 && (
        <Card>
          <p className="text-sm text-muted">
            Chưa có ai nộp bài. Thống kê sẽ hiện ngay khi có bài nộp đầu tiên.
          </p>
        </Card>
      )}

      {hardest.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Câu sai nhiều nhất</CardTitle>
              <CardDescription>Xếp theo tỉ lệ đúng thấp nhất — nên chữa lại trên lớp.</CardDescription>
            </div>
          </CardHeader>

          <ul className="space-y-2">
            {hardest.map((s) => {
              const p = pct(s.correct, s.answered);
              return (
                <li
                  key={s.questionId}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line px-4 py-3"
                >
                  <Badge tone="brand">Câu {s.orderIndex + 1}</Badge>
                  <span className="min-w-0 flex-1 truncate text-sm text-body">{s.prompt}</span>
                  {s.domain && <Badge tone="info">{s.domain}</Badge>}
                  <span className="tnum shrink-0 text-sm font-bold text-ink">
                    {p}% đúng
                  </span>
                  <span className="tnum shrink-0 text-[13px] text-muted">
                    {s.correct}/{s.answered}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Heatmap câu × học sinh</CardTitle>
            <CardDescription>
              Nhìn theo cột biết cả lớp vướng câu nào, theo hàng biết ai đang đuối.
            </CardDescription>
          </div>
        </CardHeader>

        {/* Bảng rộng thì cuộn trong khung, không đẩy cả trang trượt ngang */}
        <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-surface pb-2 pr-3 text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">
                  Học sinh
                </th>
                {stats.map((s) => (
                  <th
                    key={s.questionId}
                    className="tnum px-1 pb-2 text-center text-[12px] font-semibold text-muted"
                    title={s.prompt}
                  >
                    {s.orderIndex + 1}
                  </th>
                ))}
                <th className="pb-2 pl-3 text-right text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">
                  Đúng
                </th>
              </tr>
            </thead>
            <tbody>
              {heatmap.map((row) => (
                <tr key={row.studentId}>
                  <td className="sticky left-0 z-10 max-w-[160px] truncate bg-surface py-1 pr-3 text-sm font-medium text-ink">
                    {row.name}
                  </td>
                  {stats.map((s) => {
                    const v = row.cells[s.questionId];
                    return (
                      <td key={s.questionId} className="px-1 py-1">
                        <Cell value={v} />
                      </td>
                    );
                  })}
                  <td className="tnum py-1 pl-3 text-right text-sm font-bold text-ink">
                    {row.status === "assigned" ? "—" : `${row.correct}/${stats.length}`}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="sticky left-0 z-10 bg-surface pt-2 pr-3 text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">
                  Tỉ lệ đúng
                </td>
                {stats.map((s) => {
                  const p = pct(s.correct, s.answered);
                  const tone = rateTone(p);
                  return (
                    <td key={s.questionId} className="px-1 pt-2 text-center">
                      <span
                        className={cn(
                          "tnum inline-block rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                          tone === "success" && "bg-success-soft text-[#0d7a54]",
                          tone === "accent" && "bg-accent-soft text-[#9a6200]",
                          tone === "danger" && "bg-danger-soft text-[#b32340]",
                          tone === "neutral" && "bg-sunken text-muted",
                        )}
                      >
                        {p === null ? "—" : p}
                      </span>
                    </td>
                  );
                })}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-[13px] text-muted">
          <span className="flex items-center gap-1.5">
            <Cell value /> Đúng
          </span>
          <span className="flex items-center gap-1.5">
            <Cell value={false} /> Sai
          </span>
          <span className="flex items-center gap-1.5">
            <Cell value={null} /> Chưa nộp / tự luận
          </span>
        </div>
      </Card>

      {domains.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Theo mảng kiến thức</CardTitle>
              <CardDescription>Yếu nhất xếp trên đầu.</CardDescription>
            </div>
          </CardHeader>

          <ul className="space-y-2.5">
            {domains.map((d) => {
              const p = pct(d.correct, d.answered);
              return (
                <li key={d.domain}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">{d.domain}</span>
                    <span className="tnum text-[13px] text-muted">
                      {d.questions} câu · {p === null ? "chưa có dữ liệu" : `${p}% đúng`}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-sunken">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-500",
                        rateTone(p) === "success" && "bg-success",
                        rateTone(p) === "accent" && "bg-accent",
                        rateTone(p) === "danger" && "bg-danger",
                        rateTone(p) === "neutral" && "bg-line-strong",
                      )}
                      style={{ width: `${p ?? 0}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

/** Không chỉ dùng màu: có icon cho người mù màu (DESIGN.md §10). */
function Cell({ value }: { value: boolean | null | undefined }) {
  if (value === true) {
    return (
      <span className="grid size-6 place-items-center rounded-[6px] bg-success-soft text-[#0d7a54]">
        <Check size={14} strokeWidth={3} />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="grid size-6 place-items-center rounded-[6px] bg-danger-soft text-[#b32340]">
        <X size={14} strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className="grid size-6 place-items-center rounded-[6px] bg-sunken text-muted">
      <Minus size={14} />
    </span>
  );
}
