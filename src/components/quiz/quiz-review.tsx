import { Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import type { QuestionForStudent } from "@/lib/repo/questions";

/**
 * Xem lại bài sau khi giáo viên đã trả. Đây là lúc DUY NHẤT học sinh
 * thấy đáp án đúng và lời giải.
 */
export function QuizReview({
  questions,
  answers,
}: {
  questions: QuestionForStudent[];
  answers: Record<string, { response: string | null; isCorrect: boolean | null }>;
}) {
  const graded = questions.filter((q) => answers[q.id]?.isCorrect !== null);
  const right = graded.filter((q) => answers[q.id]?.isCorrect === true).length;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-muted">
              Số câu đúng
            </p>
            <p className="tnum font-display text-[32px] font-extrabold leading-none text-ink">
              {right}
              <span className="text-lg font-semibold text-muted">/{graded.length}</span>
            </p>
          </div>
          <p className="text-[13px] text-muted">Xem lại từng câu ở dưới</p>
        </div>
      </Card>

      {questions.map((q, i) => {
        const a = answers[q.id];
        const ok = a?.isCorrect;
        const mine = a?.response?.trim() || null;

        return (
          <Card
            key={q.id}
            className={cn(ok === true && "border-success", ok === false && "border-danger")}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone="brand">Câu {i + 1}</Badge>
              {ok === true && (
                <Badge tone="success">
                  <Check /> Đúng
                </Badge>
              )}
              {ok === false && (
                <Badge tone="danger">
                  <X /> Sai
                </Badge>
              )}
              {ok === null && <Badge tone="neutral">Giáo viên chấm tay</Badge>}
            </div>

            <p className="mb-3 whitespace-pre-wrap text-body">{q.prompt}</p>

            {q.imageR2Key && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`/api/question-image?key=${encodeURIComponent(q.imageR2Key)}`}
                alt="Hình của câu hỏi"
                className="mb-3 max-h-[380px] rounded-[var(--radius-md)] border border-line"
              />
            )}

            {q.type === "mcq" && q.choices && (
              <ul className="space-y-1.5">
                {q.choices.map((c) => {
                  const isRight = c.key === q.correctAnswer;
                  const isMine = c.key === mine;
                  return (
                    <li
                      key={c.key}
                      className={cn(
                        "flex items-center gap-2.5 rounded-[var(--radius-md)] border px-3 py-2",
                        isRight && "border-success bg-success-soft",
                        isMine && !isRight && "border-danger bg-danger-soft",
                        !isRight && !isMine && "border-line",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-bold",
                          isRight && "bg-success text-white",
                          isMine && !isRight && "bg-danger text-white",
                          !isRight && !isMine && "bg-sunken text-muted",
                        )}
                      >
                        {c.key}
                      </span>
                      <span className="min-w-0 flex-1 text-[14px] text-ink">{c.text}</span>
                      {isMine && (
                        <span className="shrink-0 text-[12px] font-semibold text-muted">
                          Bạn chọn
                        </span>
                      )}
                      {isRight && (
                        <span className="shrink-0 text-[12px] font-semibold text-[#199647]">
                          Đáp án
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {q.type !== "mcq" && (
              <div className="flex flex-wrap gap-4 text-sm">
                <span>
                  <span className="text-muted">Bạn trả lời: </span>
                  <span className={cn("tnum font-semibold", ok === false ? "text-danger" : "text-ink")}>
                    {mine ?? "(bỏ trống)"}
                  </span>
                </span>
                {q.correctAnswer && (
                  <span>
                    <span className="text-muted">Đáp án: </span>
                    <span className="tnum font-semibold text-[#199647]">{q.correctAnswer}</span>
                  </span>
                )}
              </div>
            )}

            {q.explanation && (
              <div className="mt-3 rounded-[var(--radius-md)] bg-primary-soft px-4 py-3">
                <p className="mb-1 text-[13px] font-semibold text-primary">Giải thích</p>
                <p className="whitespace-pre-wrap text-body">{q.explanation}</p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
