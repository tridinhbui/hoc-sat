import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { buildPracticeSet, weakDomains } from "@/lib/repo/practice";
import { urgencyOf } from "@/lib/practice/types";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PracticeRunner } from "@/components/practice/practice-runner";

const URGENCY_TONE = { cao: "danger", vừa: "accent", thấp: "neutral" } as const;

export default async function Practice({
  searchParams,
}: PageProps<"/student/practice">) {
  const ctx = await requireRole("student", "admin");
  const { domain } = await searchParams;
  const picked = typeof domain === "string" ? domain : undefined;

  const domains = await weakDomains(ctx);

  if (picked) {
    const questions = await buildPracticeSet(ctx, picked);
    if (questions.length === 0) {
      return (
        <EmptyState
          title={`Chưa có câu nào để ôn cho ${picked}`}
          description="Mảng này chưa có câu hỏi nào trong các bài đã giao của lớp bạn."
          action={
            <Link href="/student/practice">
              <Button variant="secondary">Chọn mảng khác</Button>
            </Link>
          }
        />
      );
    }

    return (
      <div className="space-y-4">
        <Link href="/student/practice" className="text-sm font-semibold text-primary">
          Quay lại danh sách
        </Link>
        <PracticeRunner domain={picked} questions={questions} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>Luyện tập theo điểm yếu</h1>
        <p className="text-sm text-muted">
          Bộ câu dựng từ chính những câu bạn đã làm sai, không phải đề ngẫu nhiên.
        </p>
      </div>

      {domains.length === 0 ? (
        <EmptyState
          title="Chưa có gì để ôn"
          description="Khi bạn làm bài trắc nghiệm và giáo viên chấm xong, những mảng kiến thức còn yếu sẽ hiện ở đây."
        />
      ) : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Mảng cần ôn</CardTitle>
              <CardDescription>Xếp theo tỉ lệ đúng, thấp nhất lên đầu.</CardDescription>
            </div>
          </CardHeader>

          <ul className="space-y-2">
            {domains.map((d) => (
              <li
                key={d.domain}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{d.domain}</span>
                  <span className="tnum block text-[13px] text-muted">
                    Đúng {d.correct}/{d.answered} câu · sai {d.wrong}
                  </span>
                </span>
                <Badge tone={URGENCY_TONE[urgencyOf(d)]}>
                  {d.rate === null ? "chưa rõ" : `${d.rate}%`}
                </Badge>
                <Link href={`/student/practice?domain=${encodeURIComponent(d.domain)}`}>
                  <Button size="sm" variant="secondary">
                    Ôn ngay
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
