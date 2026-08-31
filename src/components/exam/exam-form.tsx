"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createExamAction } from "@/lib/actions/exams";
import { EXAM_KINDS, EXAM_KIND_LABEL, MODULE_PRESETS } from "@/lib/exam/types";

type Subject = "rw" | "math";

export function ExamForm({ classId, subject }: { classId: string; subject: Subject }) {
  // Lớp môn nào thì mặc định hai module môn đó — đúng định dạng SAT.
  const [modules, setModules] = useState<Subject[]>([subject, subject]);
  const [state, action] = useActionState(createExamAction, null);

  return (
    <Card className="mx-auto max-w-[680px]">
      <CardHeader>
        <div>
          <CardTitle>Tạo đề thi</CardTitle>
          <CardDescription>
            Thời lượng và số câu lấy theo preset SAT, không phải gõ tay.
          </CardDescription>
        </div>
      </CardHeader>

      <form action={action} className="space-y-4">
        <input type="hidden" name="classId" value={classId} />
        {modules.map((m, i) => (
          <input key={i} type="hidden" name="modules" value={m} />
        ))}

        <Field label="Tên đề thi">
          <Input name="title" required autoFocus maxLength={200} placeholder="Midterm SAT Math" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Loại">
            <select
              name="kind"
              defaultValue="midterm"
              className="h-11 w-full rounded-[var(--radius-md)] border border-transparent bg-sunken px-4 text-[15px] text-ink focus:border-line-strong focus:bg-surface"
            >
              {EXAM_KINDS.map((k) => (
                <option key={k} value={k}>
                  {EXAM_KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ngưỡng vi phạm" hint="Vượt quá thì bài bị nộp và chấm">
            <Input name="violationLimit" type="number" min={1} max={10} defaultValue={3} required />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mở ca thi" hint="Giờ Việt Nam">
            <Input name="openAt" type="datetime-local" required />
          </Field>
          <Field label="Đóng ca thi" hint="Hết giờ này là không ai làm bài được nữa">
            <Input name="closeAt" type="datetime-local" required />
          </Field>
        </div>

        <div>
          <span className="mb-2 block text-[13px] font-semibold text-ink">
            Module, theo đúng thứ tự làm bài
          </span>
          <ul className="mb-2 space-y-2">
            {modules.map((m, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line px-3.5 py-2.5"
              >
                <Badge tone="brand">Module {i + 1}</Badge>
                <span className="min-w-0 flex-1 text-sm font-semibold text-ink">
                  {MODULE_PRESETS[m].name}
                </span>
                <span className="tnum text-[13px] text-muted">
                  {MODULE_PRESETS[m].durationMinutes} phút · {MODULE_PRESETS[m].questionCount} câu
                </span>
                {modules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setModules((p) => p.filter((_, j) => j !== i))}
                    className="text-muted hover:text-[#b32340]"
                    title="Bỏ module này"
                  >
                    <X size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            {(["math", "rw"] as Subject[]).map((s) => (
              <Button
                key={s}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setModules((p) => [...p, s])}
              >
                <Plus /> Thêm {MODULE_PRESETS[s].name}
              </Button>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-2.5 rounded-[var(--radius-md)] bg-sunken px-3.5 py-3">
          <input
            type="checkbox"
            name="lockdown"
            defaultChecked
            className="mt-0.5 size-4 accent-[var(--color-primary)]"
          />
          <span>
            <span className="block text-sm font-semibold text-ink">Bật chế độ khoá màn hình</span>
            <span className="block text-[13px] text-muted">
              Ép toàn màn hình, chặn copy-paste, ghi log khi học sinh chuyển tab. Lưu ý: cách này
              không chặn được điện thoại hay máy thứ hai, muốn chặt thì phải thi tại phòng máy.
            </span>
          </span>
        </label>

        {state?.error && <Alert>{state.error}</Alert>}

        <div className="flex justify-end">
          <SubmitButton pendingText="Đang tạo...">Tạo đề thi</SubmitButton>
        </div>
      </form>
    </Card>
  );
}
