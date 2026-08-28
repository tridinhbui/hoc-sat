"use client";

import { useActionState, useRef, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EVENT_LABEL, EVENT_TYPES, type EventType } from "@/lib/calendar/types";
import { createEventAction } from "@/lib/actions/calendar";

/** Loại tự sinh từ dữ liệu khác thì không cho tạo tay, tránh trùng lặp. */
const CREATABLE: EventType[] = ["class", "midterm", "final", "other"];

export function EventComposer({
  classes,
}: {
  classes: { id: string; name: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [allDay, setAllDay] = useState(false);
  const [state, action] = useActionState(createEventAction, null);

  if (classes.length === 0) return null;

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <CalendarPlus /> Thêm vào lịch
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Thêm vào lịch</CardTitle>
          <CardDescription>
            Hạn nộp bài và lịch thi tự lên lịch rồi — ở đây chỉ thêm buổi học, buổi bù, hay
            thông báo nghỉ.
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Đóng
        </Button>
      </CardHeader>

      <form
        ref={formRef}
        action={async (fd) => {
          await action(fd);
          formRef.current?.reset();
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lớp">
            <select
              name="classId"
              required
              className="h-11 w-full rounded-[var(--radius-md)] border border-transparent bg-sunken px-4 text-[15px] text-ink focus:border-line-strong focus:bg-surface"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Loại">
            <select
              name="type"
              defaultValue="class"
              className="h-11 w-full rounded-[var(--radius-md)] border border-transparent bg-sunken px-4 text-[15px] text-ink focus:border-line-strong focus:bg-surface"
            >
              {EVENT_TYPES.filter((t) => CREATABLE.includes(t)).map((t) => (
                <option key={t} value={t}>
                  {EVENT_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Tiêu đề">
          <Input name="title" required maxLength={200} placeholder="Buổi 12 — Ôn Algebra" />
        </Field>

        <label className="flex items-center gap-2.5 rounded-[var(--radius-md)] bg-sunken px-3.5 py-3">
          <input
            type="checkbox"
            name="allDay"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="size-4 accent-[var(--color-primary)]"
          />
          <span className="text-sm font-semibold text-ink">Cả ngày</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bắt đầu" hint="Giờ Việt Nam">
            <Input name="startAt" type={allDay ? "date" : "datetime-local"} required />
          </Field>
          <Field label="Kết thúc" hint="Không bắt buộc">
            <Input name="endAt" type={allDay ? "date" : "datetime-local"} />
          </Field>
        </div>

        <Field label="Mô tả" hint="Không bắt buộc">
          <Textarea name="description" rows={2} maxLength={2000} />
        </Field>

        {state?.error && <Alert>{state.error}</Alert>}
        {state?.ok && <Alert tone="success">{state.ok}</Alert>}

        <div className="flex justify-end">
          <SubmitButton size="sm" pendingText="Đang thêm...">
            <CalendarPlus /> Thêm vào lịch
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}
