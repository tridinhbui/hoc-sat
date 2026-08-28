"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Flag, Loader2, Maximize } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Countdown } from "./countdown";
import { useLockdown } from "./use-lockdown";
import {
  logProctorAction,
  saveExamAnswerAction,
  startModuleAction,
  submitModuleAction,
} from "@/lib/actions/exams";
import type { ProctorEventType } from "@/lib/exam/types";

type Question = {
  id: string;
  orderIndex: number;
  prompt: string;
  imageR2Key: string | null;
  type: "mcq" | "grid_in" | "free_text";
  choices: { key: string; text: string }[] | null;
  points: number;
};

type ModuleInfo = {
  id: string;
  name: string;
  durationMinutes: number;
  orderIndex: number;
};

/**
 * Phòng thi.
 *
 * Tone ở đây CỐ Ý trung tính: không mascot, không emoji, không confetti.
 * Đang thi mà thấy Cú nhảy múa thì phản cảm — xem DESIGN.md §1, §9.
 */
export function ExamRoom({
  classId,
  attemptId,
  module,
  questions,
  initialAnswers,
  initialExpiresAt,
  lockdown,
  violationLimit,
  violationCount: initialViolations,
  moduleIndex,
  moduleTotal,
}: {
  classId: string;
  attemptId: string;
  module: ModuleInfo;
  questions: Question[];
  initialAnswers: Record<string, { response: string | null; flagged: boolean }>;
  initialExpiresAt: number | null;
  lockdown: boolean;
  violationLimit: number;
  violationCount: number;
  moduleIndex: number;
  moduleTotal: number;
}) {
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [answers, setAnswers] = useState(initialAnswers);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [violations, setViolations] = useState(initialViolations);
  const [warning, setWarning] = useState<string>();
  const [ended, setEnded] = useState<string>();
  const [busy, setBusy] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const report = useCallback(
    async (type: ProctorEventType, meta?: Record<string, unknown>) => {
      // Gửi ngay từng sự kiện, không gom lô: mất mạng giữa chừng thì vẫn
      // còn dấu vết những gì đã kịp gửi.
      const res = await logProctorAction({ classId, attemptId, type, meta });
      setViolations(res.violationCount);
      if (res.exceeded) {
        setEnded(
          `Bài thi đã kết thúc do vượt quá ${res.limit} lần vi phạm. Bài của bạn đã được ghi nhận và chấm.`,
        );
      } else if (res.violationCount > 0) {
        setWarning(`Ghi nhận vi phạm ${res.violationCount}/${res.limit}.`);
      }
    },
    [classId, attemptId],
  );

  const { fullscreen, requestFullscreen } = useLockdown({
    enabled: lockdown && !ended,
    attemptId,
    onEvent: report,
  });

  useEffect(() => {
    const t = timers.current;
    return () => Object.values(t).forEach(clearTimeout);
  }, []);

  async function begin() {
    setBusy(true);
    if (lockdown) await requestFullscreen();
    const res = await startModuleAction({ classId, attemptId, moduleId: module.id });
    setBusy(false);
    if (!res.ok) return setEnded(res.error);
    setExpiresAt(res.expiresAt ?? null);
  }

  function update(questionId: string, patch: { response?: string | null; flagged?: boolean }) {
    setAnswers((prev) => {
      const cur = prev[questionId] ?? { response: null, flagged: false };
      const next = { ...cur, ...patch };

      clearTimeout(timers.current[questionId]);
      setSaving("saving");
      timers.current[questionId] = setTimeout(async () => {
        const res = await saveExamAnswerAction({
          classId,
          attemptId,
          moduleId: module.id,
          questionId,
          response: next.response,
          flagged: next.flagged,
        });
        setSaving(res.ok ? "saved" : "error");
        // Server từ chối = hết giờ hoặc module đã khoá. Nói thẳng.
        if (!res.ok) setWarning(res.error);
      }, 400);

      return { ...prev, [questionId]: next };
    });
  }

  const finishModule = useCallback(async () => {
    setBusy(true);
    const res = await submitModuleAction({ classId, attemptId, moduleId: module.id });
    setBusy(false);
    if (!res.ok) return setWarning(res.error);
    // Nạp lại từ server để lấy module kế hoặc trang kết quả.
    window.location.reload();
  }, [classId, attemptId, module.id]);

  const answered = questions.filter((q) => {
    const a = answers[q.id];
    return a?.response != null && a.response !== "";
  }).length;

  if (ended) {
    return (
      <div className="exam-mode grid min-h-dvh place-items-center px-5">
        <div className="max-w-[460px] text-center">
          <h1 className="mb-3">Bài thi đã kết thúc</h1>
          <p className="text-[#c3cbe4]">{ended}</p>
        </div>
      </div>
    );
  }

  // Chưa bấm bắt đầu: đồng hồ chưa chạy, chưa ai mất giây nào.
  if (!expiresAt) {
    return (
      <div className="exam-mode grid min-h-dvh place-items-center px-5">
        <div className="w-full max-w-[520px]">
          <p className="mb-1 text-sm text-[#8f9ac2]">
            Module {moduleIndex + 1}/{moduleTotal}
          </p>
          <h1 className="mb-4">{module.name}</h1>

          <div className="mb-6 space-y-2 rounded-[var(--radius-lg)] bg-white/5 p-5 text-[15px] text-[#c3cbe4]">
            <p>
              <strong className="text-white">{module.durationMinutes} phút</strong> ·{" "}
              {questions.length} câu
            </p>
            <p>Đồng hồ bắt đầu chạy ngay khi bạn bấm Bắt đầu. Không tạm dừng được.</p>
            {lockdown && (
              <>
                <p>
                  Màn hình sẽ chuyển sang chế độ toàn màn hình. Thoát ra, chuyển tab hoặc mở đề ở
                  cửa sổ khác đều được ghi lại.
                </p>
                <p>
                  Quá <strong className="text-white">{violationLimit} lần</strong> vi phạm, bài sẽ
                  bị nộp và chấm với những gì đã làm.
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={begin}
            disabled={busy}
            className="w-full rounded-full bg-white px-6 py-3.5 font-display text-base font-bold text-[#0f1b45] disabled:opacity-50"
          >
            {busy ? "Đang mở đề..." : "Bắt đầu làm bài"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="exam-mode min-h-dvh">
      {/* Mất toàn màn hình: che kín đề cho tới khi vào lại. */}
      {lockdown && !fullscreen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#0f1b45] px-5">
          <div className="max-w-[420px] text-center">
            <AlertTriangle size={40} className="mx-auto mb-4 text-[#f0526b]" />
            <h2 className="mb-2">Bạn đã thoát toàn màn hình</h2>
            <p className="mb-1 text-[#c3cbe4]">
              Lần vi phạm {violations}/{violationLimit}. Đồng hồ vẫn đang chạy.
            </p>
            <p className="mb-5 text-sm text-[#8f9ac2]">
              Vào lại toàn màn hình để tiếp tục làm bài.
            </p>
            <button
              type="button"
              onClick={requestFullscreen}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-[#0f1b45]"
            >
              <Maximize size={18} /> Vào lại toàn màn hình
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#0f1b45] px-5 py-3">
        <span className="text-sm font-semibold text-white">
          {module.name}
          <span className="ml-2 font-normal text-[#8f9ac2]">
            Module {moduleIndex + 1}/{moduleTotal}
          </span>
        </span>

        <span className="tnum text-sm text-[#c3cbe4]">
          {answered}/{questions.length} câu
        </span>

        <span className="flex items-center gap-1.5 text-[13px] text-[#8f9ac2]">
          {saving === "saving" && <Loader2 size={14} className="animate-spin" />}
          {saving === "saved" && <Check size={14} className="text-[#22c58b]" />}
          {saving === "saving" ? "Đang lưu" : saving === "saved" ? "Đã lưu" : ""}
          {saving === "error" && <span className="text-[#f0526b]">Lưu lỗi</span>}
        </span>

        <div className="ml-auto flex items-center gap-3">
          {violations > 0 && (
            <span className="tnum rounded-full bg-[#f0526b]/20 px-3 py-1 text-[13px] font-semibold text-[#ffb3c0]">
              Vi phạm {violations}/{violationLimit}
            </span>
          )}
          <Countdown key={expiresAt} expiresAt={expiresAt} onExpire={finishModule} />
        </div>
      </header>

      {warning && (
        <p className="border-b border-white/10 bg-[#f0526b]/15 px-5 py-2.5 text-sm text-[#ffb3c0]">
          {warning}
        </p>
      )}

      <main className="mx-auto max-w-[760px] space-y-4 px-5 py-6">
        {questions.map((q, i) => {
          const a = answers[q.id] ?? { response: null, flagged: false };
          return (
            <section
              key={q.id}
              className={cn(
                "rounded-[var(--radius-lg)] border bg-white/5 p-5",
                a.flagged ? "border-[#ffb020]" : "border-white/10",
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="tnum text-sm font-bold text-white">Câu {i + 1}</span>
                <button
                  type="button"
                  onClick={() => update(q.id, { flagged: !a.flagged })}
                  title={a.flagged ? "Bỏ đánh dấu" : "Đánh dấu xem lại"}
                  className={cn(
                    "grid size-9 place-items-center rounded-full",
                    a.flagged ? "bg-[#ffb020] text-[#0f1b45]" : "text-[#8f9ac2] hover:bg-white/10",
                  )}
                >
                  <Flag size={17} />
                </button>
              </div>

              <p className="mb-4 whitespace-pre-wrap text-[#e8ecf8]">{q.prompt}</p>

              {q.imageR2Key && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={`/api/question-image?key=${encodeURIComponent(q.imageR2Key)}`}
                  alt="Hình của câu hỏi"
                  className="mb-4 max-h-[380px] rounded-[var(--radius-md)] border border-white/10"
                />
              )}

              {q.type === "mcq" && q.choices && (
                <ul className="space-y-2">
                  {q.choices.map((c) => {
                    const picked = a.response === c.key;
                    return (
                      <li key={c.key}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-3.5 py-3",
                            picked ? "border-white bg-white/15" : "border-white/15 hover:border-white/40",
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
                              picked ? "bg-white text-[#0f1b45]" : "bg-white/10 text-[#c3cbe4]",
                            )}
                          >
                            {c.key}
                          </span>
                          <span className="min-w-0 flex-1 text-[15px] text-[#e8ecf8]">{c.text}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}

              {q.type !== "mcq" && (
                <input
                  value={a.response ?? ""}
                  onChange={(e) => update(q.id, { response: e.target.value })}
                  placeholder={q.type === "grid_in" ? "Ví dụ: 3/4 hoặc .75" : "Bài làm..."}
                  className="tnum h-12 w-full max-w-[260px] rounded-[var(--radius-md)] border border-white/20 bg-white/10 px-4 text-center text-lg font-bold text-white placeholder:text-[#8f9ac2]"
                />
              )}
            </section>
          );
        })}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-[#c3cbe4]">
            {moduleIndex + 1 < moduleTotal
              ? "Nộp module này rồi chuyển sang module kế. Không quay lại được."
              : "Đây là module cuối. Nộp là kết thúc bài thi."}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const left = questions.length - answered;
              if (left > 0 && !confirm(`Còn ${left} câu chưa trả lời. Nộp module này?`)) return;
              finishModule();
            }}
            className="rounded-full bg-white px-6 py-3 font-semibold text-[#0f1b45] disabled:opacity-50"
          >
            {busy ? "Đang nộp..." : moduleIndex + 1 < moduleTotal ? "Nộp và sang module kế" : "Nộp bài thi"}
          </button>
        </div>
      </main>
    </div>
  );
}
