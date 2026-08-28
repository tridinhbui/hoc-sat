"use client";

import { useActionState, useState } from "react";
import { BookOpen, Calculator, ArrowLeft, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils/cn";
import { createClassAction } from "@/lib/actions/classes";

type Subject = "rw" | "math";

const OPTIONS: {
  value: Subject;
  label: string;
  desc: string;
  icon: typeof BookOpen;
  tone: string;
}[] = [
  {
    value: "rw",
    label: "Reading & Writing",
    desc: "Module 32 phút / 27 câu. Đề nhiều đoạn văn, câu hỏi ngữ cảnh.",
    icon: BookOpen,
    tone: "bg-primary-soft text-primary",
  },
  {
    value: "math",
    label: "Math",
    desc: "Module 35 phút / 22 câu. Có câu grid-in, đề nhiều biểu đồ.",
    icon: Calculator,
    tone: "bg-accent-soft text-[#9a6200]",
  },
];

/**
 * Chọn loại lớp TRƯỚC khi đặt tên — loại lớp quyết định preset đề thi và
 * dạng câu hỏi, đổi sau sẽ làm hỏng đề đã soạn.
 */
export function NewClassWizard() {
  const [subject, setSubject] = useState<Subject>();
  const [state, action] = useActionState(createClassAction, null);

  if (!subject) {
    return (
      <div className="mx-auto max-w-[640px] space-y-5">
        <div>
          <h1>Lớp này dạy môn gì?</h1>
          <p className="text-sm text-muted">
            Chọn trước để hệ thống dùng đúng preset đề và dạng câu hỏi. Không đổi được sau khi tạo.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setSubject(o.value)}
              className="rise rounded-[var(--radius-lg)] border border-line bg-surface p-5 text-left shadow-soft"
            >
              <span className={cn("mb-3 grid size-11 place-items-center rounded-full", o.tone)}>
                <o.icon size={22} />
              </span>
              <span className="block font-display text-[17px] font-bold text-ink">{o.label}</span>
              <span className="mt-1 block text-[13px] text-muted">{o.desc}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const chosen = OPTIONS.find((o) => o.value === subject)!;

  return (
    <div className="mx-auto max-w-[520px] space-y-5">
      <button
        type="button"
        onClick={() => setSubject(undefined)}
        className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"
      >
        <ArrowLeft size={16} /> Chọn lại môn
      </button>

      <div>
        <h1>Đặt tên cho lớp</h1>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <Check size={15} className="text-success" /> {chosen.label}
        </p>
      </div>

      <Card>
        <form action={action} className="space-y-4">
          <input type="hidden" name="subject" value={subject} />

          <Field label="Tên lớp">
            <Input
              name="name"
              required
              autoFocus
              maxLength={120}
              placeholder={
                subject === "math" ? "SAT Math — Sáng T7" : "SAT Reading & Writing — Tối T3/T5"
              }
            />
          </Field>

          <Field label="Lịch học" hint="Không bắt buộc — hiện dưới tên lớp cho học sinh dễ nhớ">
            <Input name="scheduleNote" maxLength={200} placeholder="19:30–21:30 T3 & T5" />
          </Field>

          {state?.error && <Alert>{state.error}</Alert>}

          <SubmitButton block pendingText="Đang tạo lớp...">
            Tạo lớp
          </SubmitButton>

          <p className="text-center text-[13px] text-muted">
            Tạo xong sẽ có mã lớp để gửi cho học sinh.
          </p>
        </form>
      </Card>
    </div>
  );
}
