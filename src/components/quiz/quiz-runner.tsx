"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Flag, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils/cn";
import { saveAnswerAction } from "@/lib/actions/questions";
import { turnInAction } from "@/lib/actions/assignments";
import type { QuestionForStudent } from "@/lib/repo/questions";

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Màn làm bài trắc nghiệm.
 *
 * Đáp án lưu tạm lên server mỗi khi học sinh đổi lựa chọn — mất mạng hay
 * đóng nhầm tab thì không mất bài. Đúng/sai KHÔNG hiện ở đây: chấm chỉ
 * xảy ra lúc nộp, và điểm chỉ lộ ra sau khi giáo viên trả bài.
 */
export function QuizRunner({
  classId,
  assignmentId,
  submissionId,
  questions,
  initialAnswers,
  turnedIn,
}: {
  classId: string;
  assignmentId: string;
  submissionId: string;
  questions: QuestionForStudent[];
  initialAnswers: Record<string, { response: string | null; flagged: boolean }>;
  turnedIn: boolean;
}) {
  const [answers, setAnswers] = useState(initialAnswers);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const persist = useCallback(
    (questionId: string, response: string | null, flagged: boolean) => {
      clearTimeout(timers.current[questionId]);
      setSaveState("saving");
      // Gõ grid-in thì chờ một nhịp; bấm chọn trắc nghiệm thì gần như tức thì.
      timers.current[questionId] = setTimeout(async () => {
        const res = await saveAnswerAction({
          classId,
          submissionId,
          questionId,
          response,
          flagged,
        });
        setSaveState(res.ok ? "saved" : "error");
        if (!res.ok) setError(res.error);
      }, 400);
    },
    [classId, submissionId],
  );

  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach(clearTimeout);
  }, []);

  function update(questionId: string, patch: { response?: string | null; flagged?: boolean }) {
    setAnswers((prev) => {
      const cur = prev[questionId] ?? { response: null, flagged: false };
      const next = { ...cur, ...patch };
      persist(questionId, next.response, next.flagged);
      return { ...prev, [questionId]: next };
    });
  }

  const answered = questions.filter((q) => {
    const a = answers[q.id];
    return a?.response != null && a.response !== "";
  }).length;

  if (turnedIn) {
    return (
      <Card>
        <p className="text-sm text-muted">
          Bạn đã nộp bài này. Huỷ nộp ở dưới nếu muốn sửa lại đáp án.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Thanh tiến độ dính trên đầu để luôn biết còn bao nhiêu câu */}
      <div className="sticky top-0 z-10 flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface px-4 py-3 shadow-soft">
        <span className="tnum text-sm font-bold text-ink">
          {answered}/{questions.length}
        </span>
        <span className="text-[13px] text-muted">câu đã trả lời</span>
        <span className="ml-auto flex items-center gap-1.5 text-[13px]">
          {saveState === "saving" && (
            <>
              <Loader2 size={14} className="animate-spin text-muted" />
              <span className="text-muted">Đang lưu</span>
            </>
          )}
          {saveState === "saved" && (
            <>
              <Check size={14} className="text-success" />
              <span className="text-muted">Đã lưu</span>
            </>
          )}
          {saveState === "error" && <span className="text-danger">Lưu lỗi</span>}
        </span>
      </div>

      {error && <Alert>{error}</Alert>}

      {questions.map((q, i) => {
        const a = answers[q.id] ?? { response: null, flagged: false };
        return (
          <Card key={q.id} className={cn(a.flagged && "border-accent")}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">Câu {i + 1}</Badge>
                <Badge tone="neutral">{q.points} điểm</Badge>
              </div>
              <button
                type="button"
                onClick={() => update(q.id, { flagged: !a.flagged })}
                title={a.flagged ? "Bỏ đánh dấu" : "Đánh dấu xem lại"}
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full transition-colors",
                  a.flagged
                    ? "bg-accent-soft text-[#9a6200]"
                    : "text-muted hover:bg-accent-soft hover:text-[#9a6200]",
                )}
              >
                <Flag size={17} />
              </button>
            </div>

            <p className="mb-4 whitespace-pre-wrap text-body">{q.prompt}</p>

            {q.type === "mcq" && q.choices && (
              <ul className="space-y-2">
                {q.choices.map((c) => {
                  const picked = a.response === c.key;
                  return (
                    <li key={c.key}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-3.5 py-3 transition-colors",
                          picked
                            ? "border-primary bg-primary-soft"
                            : "border-line hover:border-line-strong",
                        )}
                      >
                        <input
                          type="radio"
                          name={`q_${q.id}`}
                          checked={picked}
                          onChange={() => update(q.id, { response: c.key })}
                          className="sr-only"
                        />
                        <span
                          className={cn(
                            "grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-bold",
                            picked ? "bg-primary text-white" : "bg-sunken text-muted",
                          )}
                        >
                          {c.key}
                        </span>
                        <span className="min-w-0 flex-1 text-[15px] text-ink">{c.text}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}

            {q.type === "grid_in" && (
              <div className="max-w-[220px]">
                <Input
                  value={a.response ?? ""}
                  onChange={(e) => update(q.id, { response: e.target.value })}
                  placeholder="Ví dụ: 3/4 hoặc .75"
                  inputMode="text"
                  className="tnum text-center text-lg font-bold"
                />
                <p className="mt-1.5 text-[12px] text-muted">
                  Phân số hoặc số thập phân đều được.
                </p>
              </div>
            )}

            {q.type === "free_text" && (
              <Textarea
                rows={4}
                value={a.response ?? ""}
                onChange={(e) => update(q.id, { response: e.target.value })}
                placeholder="Trình bày bài làm..."
              />
            )}
          </Card>
        );
      })}

      <Card>
        <form
          action={async (fd) => {
            setSubmitting(true);
            await turnInAction(null, fd);
            setSubmitting(false);
          }}
          onSubmit={(e) => {
            if (
              answered < questions.length &&
              !confirm(
                `Còn ${questions.length - answered} câu chưa trả lời. Nộp luôn?`,
              )
            ) {
              e.preventDefault();
            }
          }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="assignmentId" value={assignmentId} />
          <input type="hidden" name="files" value="[]" />

          <p className="text-sm text-muted">
            Nộp xong máy chấm ngay, nhưng điểm chỉ hiện khi giáo viên trả bài.
          </p>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Đang nộp..." : "Nộp bài"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
