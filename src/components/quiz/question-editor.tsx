"use client";

import { useActionState, useRef, useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import {
  addQuestionAction,
  deleteQuestionAction,
  importQuestionsAction,
} from "@/lib/actions/questions";

type QType = "mcq" | "grid_in" | "free_text";

export type EditorQuestion = {
  id: string;
  orderIndex: number;
  prompt: string;
  type: QType;
  choices: { key: string; text: string }[] | null;
  correctAnswer: string | null;
  acceptedAnswers: string[] | null;
  explanation: string | null;
  points: number;
  domain: string | null;
  skillTag: string | null;
};

const TYPE_LABEL: Record<QType, string> = {
  mcq: "Trắc nghiệm",
  grid_in: "Điền đáp số",
  free_text: "Tự luận",
};

const KEYS = ["A", "B", "C", "D"] as const;

export function QuestionEditor({
  classId,
  assignmentId,
  questions,
}: {
  classId: string;
  assignmentId: string;
  questions: EditorQuestion[];
}) {
  const [showImport, setShowImport] = useState(false);
  const total = questions.reduce((s, q) => s + q.points, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Câu hỏi</CardTitle>
            <CardDescription>
              {questions.length} câu · tổng {total} điểm. Máy chấm ngay khi học sinh nộp.
            </CardDescription>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowImport((v) => !v)}>
            <Upload /> Nhập từ CSV
          </Button>
        </CardHeader>

        {showImport && <ImportForm classId={classId} assignmentId={assignmentId} />}
      </Card>

      {questions.map((q) => (
        <Card key={q.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <Badge tone="brand">Câu {q.orderIndex + 1}</Badge>
                <Badge>{TYPE_LABEL[q.type]}</Badge>
                <Badge tone="neutral">{q.points} điểm</Badge>
                {q.domain && <Badge tone="info">{q.domain}</Badge>}
              </div>
              <p className="whitespace-pre-wrap text-body">{q.prompt}</p>
            </div>

            <form action={deleteQuestionAction}>
              <input type="hidden" name="classId" value={classId} />
              <input type="hidden" name="assignmentId" value={assignmentId} />
              <input type="hidden" name="questionId" value={q.id} />
              <button
                type="submit"
                title="Xoá câu hỏi"
                className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-[#b32340]"
              >
                <Trash2 size={17} />
              </button>
            </form>
          </div>

          {q.type === "mcq" && q.choices && (
            <ul className="mt-3 space-y-1.5">
              {q.choices.map((c) => {
                const right = c.key === q.correctAnswer;
                return (
                  <li
                    key={c.key}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[var(--radius-md)] border px-3 py-2",
                      right ? "border-success bg-success-soft" : "border-line",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-bold",
                        right ? "bg-success text-white" : "bg-sunken text-muted",
                      )}
                    >
                      {c.key}
                    </span>
                    <span className="min-w-0 flex-1 text-[14px] text-ink">{c.text}</span>
                    {right && <span className="text-[12px] font-semibold text-[#0d7a54]">Đáp án</span>}
                  </li>
                );
              })}
            </ul>
          )}

          {q.type === "grid_in" && (
            <p className="mt-3 text-sm">
              <span className="text-muted">Đáp án: </span>
              <span className="tnum font-semibold text-ink">{q.correctAnswer}</span>
              {q.acceptedAnswers?.length ? (
                <span className="text-muted"> (nhận thêm: {q.acceptedAnswers.join(", ")})</span>
              ) : null}
            </p>
          )}

          {q.explanation && (
            <p className="mt-3 rounded-[var(--radius-md)] bg-sunken px-3 py-2 text-[13px] text-body">
              <span className="font-semibold">Giải thích: </span>
              {q.explanation}
            </p>
          )}
        </Card>
      ))}

      <AddQuestionForm classId={classId} assignmentId={assignmentId} />
    </div>
  );
}

function AddQuestionForm({ classId, assignmentId }: { classId: string; assignmentId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<QType>("mcq");
  const [state, action] = useActionState(addQuestionAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thêm câu hỏi</CardTitle>
      </CardHeader>

      <form
        ref={formRef}
        action={async (fd) => {
          await action(fd);
          formRef.current?.reset();
        }}
        className="space-y-4"
      >
        <input type="hidden" name="classId" value={classId} />
        <input type="hidden" name="assignmentId" value={assignmentId} />
        <input type="hidden" name="type" value={type} />

        <div className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_LABEL) as QType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                type === t ? "bg-primary text-white" : "bg-sunken text-body hover:bg-primary-soft",
              )}
            >
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>

        <Field label="Đề bài">
          <Textarea name="prompt" rows={3} required maxLength={5000} placeholder="Nội dung câu hỏi..." />
        </Field>

        {type === "mcq" && (
          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-[13px] font-semibold text-ink">
              Lựa chọn — chọn đáp án đúng ngay tại đây
            </legend>
            {KEYS.map((k) => (
              <div key={k} className="flex items-center gap-2.5">
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="correctAnswer"
                    value={k}
                    required
                    className="size-4 accent-[var(--color-success)]"
                  />
                  <span className="w-4 text-sm font-bold text-ink">{k}</span>
                </label>
                <Input name={`choice_${k}`} placeholder={`Lựa chọn ${k}`} maxLength={1000} />
              </div>
            ))}
          </fieldset>
        )}

        {type === "grid_in" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Đáp án đúng" hint="Ví dụ: 3/4 hoặc 0.75">
              <Input name="correctAnswer" required placeholder="3/4" className="tnum" />
            </Field>
            <Field label="Nhận thêm cách viết" hint="Cách nhau bằng dấu phẩy. Thường không cần.">
              <Input name="acceptedAnswers" placeholder=".75, 0.750" className="tnum" />
            </Field>
          </div>
        )}

        {type === "free_text" && (
          <Alert tone="success">
            Câu tự luận không chấm máy được — giáo viên chấm tay ở bảng bài nộp.
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Điểm">
            <Input name="points" type="number" min={0.25} step={0.25} defaultValue={1} required />
          </Field>
          <Field label="Mảng kiến thức" hint="Để thống kê">
            <Input name="domain" maxLength={80} placeholder="Algebra" />
          </Field>
          <Field label="Kỹ năng">
            <Input name="skillTag" maxLength={80} placeholder="Linear equations" />
          </Field>
        </div>

        <Field label="Giải thích" hint="Học sinh chỉ thấy sau khi bài được trả">
          <Textarea name="explanation" rows={2} maxLength={2000} />
        </Field>

        {state?.error && <Alert>{state.error}</Alert>}
        {state?.ok && <Alert tone="success">{state.ok}</Alert>}

        <div className="flex justify-end">
          <SubmitButton size="sm" pendingText="Đang thêm...">
            <Plus /> Thêm câu hỏi
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}

function ImportForm({ classId, assignmentId }: { classId: string; assignmentId: string }) {
  const [state, action] = useActionState(importQuestionsAction, null);

  return (
    <form action={action} className="mt-4 space-y-3 border-t border-line pt-4">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="assignmentId" value={assignmentId} />

      <Field
        label="Dán CSV"
        hint="Cột: type,prompt,A,B,C,D,correct,points,domain,skill,explanation"
      >
        <Textarea
          name="csv"
          rows={6}
          required
          className="font-mono text-[13px]"
          placeholder={`mcq,"If 2x + 3 = 11, what is x?",2,4,6,8,B,1,Algebra,Linear equations,"2x = 8 nên x = 4"
grid_in,"What is 2/3 as a decimal?",,,,,2/3,1,Algebra,Fractions,`}
        />
      </Field>

      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && <Alert tone="success">{state.ok}</Alert>}

      <div className="flex justify-end">
        <SubmitButton size="sm" variant="secondary" pendingText="Đang nhập...">
          <Upload /> Nhập đề
        </SubmitButton>
      </div>
    </form>
  );
}
