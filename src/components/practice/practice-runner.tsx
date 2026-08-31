"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils/cn";
import { gradePracticeAction } from "@/lib/actions/practice";
import type { PracticeQuestion } from "@/lib/practice/types";

type Checked = {
  correct: boolean;
  correctAnswer: string | null;
  explanation: string | null;
};

/**
 * Màn luyện tập.
 *
 * Khác phòng làm bài ở đúng một điểm: chấm ngay từng câu và hiện lời giải
 * luôn, vì đây là chỗ để học chứ không phải để lấy điểm. Đáp án vẫn nằm ở
 * server cho tới khi học sinh bấm kiểm tra.
 */
export function PracticeRunner({
  domain,
  questions,
}: {
  domain: string;
  questions: PracticeQuestion[];
}) {
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [checked, setChecked] = useState<Checked | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [score, setScore] = useState({ done: 0, correct: 0 });

  const q = questions[index];
  const isLast = index === questions.length - 1;

  async function check() {
    if (!response.trim()) return;
    setBusy(true);
    setError(undefined);

    const res = await gradePracticeAction(q.id, response);
    setBusy(false);

    if ("error" in res) {
      setError(res.error);
      return;
    }
    setChecked(res);
    setScore((s) => ({ done: s.done + 1, correct: s.correct + (res.correct ? 1 : 0) }));
  }

  function next() {
    setIndex((i) => i + 1);
    setResponse("");
    setChecked(null);
    setError(undefined);
  }

  if (score.done > 0 && score.done === questions.length && checked === null) {
    const pct = Math.round((score.correct / questions.length) * 100);
    return (
      <Card className="p-6 text-center">
        <h2 className="text-xl font-bold text-ink">Xong bộ ôn {domain}</h2>
        <p className="mt-2 text-sm text-muted">
          Đúng {score.correct}/{questions.length} câu ({pct}%).
        </p>
        <p className="mt-1 text-sm text-muted">
          Bấm ôn lại mảng này để nhận bộ câu mới, hoặc chọn mảng khác trong danh sách.
        </p>
        <div className="mt-5 flex justify-center">
          <Button onClick={() => window.location.reload()}>Ôn lại mảng này</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge tone="brand">{domain}</Badge>
          {q.wrongBefore && <Badge tone="danger">Từng làm sai</Badge>}
          {!q.seenBefore && <Badge tone="neutral">Câu mới</Badge>}
        </div>
        <span className="tnum text-sm font-semibold text-muted">
          Câu {index + 1}/{questions.length}
          {score.done > 0 && ` · đúng ${score.correct}/${score.done}`}
        </span>
      </div>

      <Card className="p-5">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{q.prompt}</p>

        {q.type === "mcq" && q.choices ? (
          <ul className="mt-4 space-y-2">
            {q.choices.map((c) => {
              const picked = response === c.key;
              const isAnswer = checked && checked.correctAnswer === c.key;
              return (
                <li key={c.key}>
                  <button
                    type="button"
                    disabled={!!checked}
                    onClick={() => setResponse(c.key)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left text-sm transition-colors",
                      !checked && picked && "border-primary bg-primary-soft",
                      !checked && !picked && "border-line hover:border-primary",
                      checked && isAnswer && "border-success bg-success-soft",
                      checked && picked && !isAnswer && "border-danger bg-danger-soft",
                      checked && !picked && !isAnswer && "border-line opacity-60",
                    )}
                  >
                    <span className="font-bold text-ink">{c.key}</span>
                    <span className="text-body">{c.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4 max-w-[220px]">
            <Input
              value={response}
              disabled={!!checked}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Nhập đáp án"
              inputMode="text"
            />
          </div>
        )}

        {error && (
          <div className="mt-4">
            <Alert tone="danger">{error}</Alert>
          </div>
        )}

        {checked && (
          <div className="mt-4 space-y-2">
            <Alert tone={checked.correct ? "success" : "danger"}>
              {checked.correct
                ? "Đúng rồi."
                : `Chưa đúng. Đáp án: ${checked.correctAnswer ?? "không có"}`}
            </Alert>
            {checked.explanation && (
              <div className="rounded-[var(--radius-md)] bg-sunken px-4 py-3 text-sm leading-relaxed text-body">
                {checked.explanation}
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          {!checked ? (
            <Button onClick={check} disabled={busy || !response.trim()}>
              {busy ? "Đang chấm..." : "Kiểm tra"}
            </Button>
          ) : isLast ? (
            <Button onClick={() => setChecked(null)}>Xem kết quả</Button>
          ) : (
            <Button onClick={next}>Câu tiếp theo</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
