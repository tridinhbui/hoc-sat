"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bot,
  Calculator,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  HelpCircle,
  History,
  Layers,
  ListChecks,
  MessageSquare,
  Play,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";

import { COPY } from "@/lib/landing/content";
import { Lumi } from "@/components/mascot/lumi";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LanguageToggle } from "./language-toggle";
import { useLocale } from "./use-locale";

const FEATURE_TABS = [
  {
    id: "chat",
    icon: MessageSquare,
    title: "AI Chat & Gợi ý bước giải",
    titleEn: "AI Chat & Step-by-Step Hints",
    desc: "Hỏi đáp ngay khi làm bài. AI đưa ra gợi ý tư duy thay vì chỉ đáp án để học sinh tự tìm ra cách giải.",
  },
  {
    id: "analysis",
    icon: Wand2,
    title: "AI Phân tích điểm yếu",
    titleEn: "AI Weakness Analysis",
    desc: "Chỉ ra chính xác mảng kiến thức đang mất điểm nhiều nhất (Algebra, Transitions, Advanced Math).",
  },
  {
    id: "planner",
    icon: Layers,
    title: "Lộ trình học thích ứng",
    titleEn: "AI Study Planner",
    desc: "Tự động phân bổ bài tập hàng ngày dựa trên ngày thi thực tế và điểm số mục tiêu.",
  },
  {
    id: "vocab",
    icon: BookOpen,
    title: "Sổ tay từ vựng ngữ cảnh",
    titleEn: "Vocabulary Notebook",
    desc: "Ghi nhớ từ vựng SAT trong văn cảnh bài đọc với thẻ flashcard và phát âm chuẩn.",
  },
  {
    id: "error",
    icon: History,
    title: "Sổ tay câu sai (Error Bank)",
    titleEn: "Smart Error Bank",
    desc: "Lưu trữ mọi câu hỏi làm sai, phân loại lý do (bẫy đề, tính toán nhầm, thiếu kiến thức) để ôn lại.",
  },
];

export function Landing() {
  const [locale, setLocale] = useLocale();
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    document.documentElement.lang = COPY[locale].htmlLang;
  }, [locale]);

  const t = COPY[locale];
  const isVi = locale === "vi";

  return (
    <div className="min-h-dvh bg-bg text-body selection:bg-primary-soft selection:text-primary">
      {/* -------------------------------------------------------------
          TOP BANNER PILL NOTIFICATION (Ảnh 4)
          ------------------------------------------------------------- */}
      <div className="pt-3">
        <div className="mx-auto flex max-w-[1180px] justify-center px-4">
          <Link
            href="/login"
            className="group flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition-transform hover:scale-[1.01]"
          >
            <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase">
              MỚI
            </span>
            <span className="text-slate-200">
              {isVi
                ? "Ngân hàng 7,000+ câu hỏi Digital SAT bám sát College Board"
                : "Access 7,000+ SAT Questions in Question Bank"}
            </span>
            <ChevronRight size={14} className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* -------------------------------------------------------------
          HEADER / NAVBAR (Ảnh 4)
          ------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 border-b border-line/70 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between gap-4 px-5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-primary text-white shadow-xs">
              <Sparkles size={18} />
            </span>
            <span className="font-display text-xl font-black tracking-tight text-ink">
              HocSAT<span className="text-primary">.ai</span>
            </span>
          </Link>

          {/* Navigation links */}
          <nav className="hidden items-center gap-6 text-sm font-semibold text-body md:flex">
            <a href="#features" className="transition-colors hover:text-primary">
              {isVi ? "Tính năng" : "Features"}
            </a>
            <a href="#environment" className="transition-colors hover:text-primary">
              {isVi ? "Phòng thi thử" : "Test Environment"}
            </a>
            <a href="#courses" className="transition-colors hover:text-primary">
              {isVi ? "Khóa học SAT" : "SAT Courses"}
            </a>
            <a href="#audience" className="transition-colors hover:text-primary">
              {isVi ? "Dành cho trung tâm" : "For Academies"}
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <LanguageToggle value={locale} onChange={setLocale} label={t.langSwitchLabel} />
            <Link href="/login">
              <button
                type="button"
                className="rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-xs transition-transform hover:bg-primary-hover hover:shadow-md active:scale-95"
              >
                {isVi ? "Vào học ngay" : "Open App"}
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* -------------------------------------------------------------
            HERO SECTION (Ảnh 4)
            ------------------------------------------------------------- */}
        <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
          {/* Vòng sáng nền mờ */}
          <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-[620px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-400/15 to-indigo-500/15 blur-3xl" />

          <div className="mx-auto max-w-[980px] px-5 text-center">
            {/* Title */}
            <h1 className="font-display text-4xl font-black tracking-tight text-ink sm:text-5xl md:text-6xl md:leading-[1.15]">
              {isVi ? "Luyện thi Digital SAT® thông minh," : "HocSAT AI for Digital SAT® Prep,"}
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                {isVi ? "Nhẹ nhàng & Đột phá điểm số" : "Fun and Easy"}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mt-6 max-w-[680px] text-base leading-relaxed text-body md:text-lg">
              {isVi
                ? "HocSAT AI thấu hiểu phong cách học của bạn ❖ — liên tục thích ứng câu hỏi, phân tích điểm mù và tối ưu chiến thuật để bứt phá mục tiêu 1400+ và 1500+ nhanh nhất 🚀"
                : "HocSAT AI learns how you learn ❖ — adapting questions, pacing, and strategy to close your gaps faster 🚀"}
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <Link href="/login">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-primary-hover hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span>{isVi ? "Bắt đầu hành trình SAT®" : "Start your SAT® Journey"}</span>
                  <ArrowUpRight size={18} />
                </button>
              </Link>

              <a href="#environment">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-line-strong/80 bg-surface px-7 py-3.5 text-sm font-bold text-ink shadow-xs transition-all hover:bg-sunken hover:-translate-y-0.5"
                >
                  <span>{isVi ? "Xem cách hoạt động" : "See how it works"}</span>
                  <HelpCircle size={16} className="text-muted" />
                </button>
              </a>
            </div>

            {/* -------------------------------------------------------------
                FLOATING 3D DASHBOARD PREVIEW (Ảnh 4)
                ------------------------------------------------------------- */}
            <div className="relative mx-auto mt-14 max-w-[940px] px-2">
              <div className="rounded-3xl border border-line/80 bg-surface p-4 shadow-soft-lg ring-8 ring-blue-50/50 md:p-6">
                {/* Topbar bên trong Mockup */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 pb-4 text-xs">
                  <div className="flex items-center gap-2 font-bold text-muted">
                    <span>📅</span>
                    <span>{isVi ? "Đếm ngược ngày thi:" : "Exam day in:"}</span>
                    <span className="rounded-full bg-primary-soft px-2.5 py-0.5 font-black text-primary">
                      27d 10h 1m
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 font-bold text-ink">
                      <span className="text-muted">Dự đoán điểm:</span>
                      <span className="text-sm font-black text-primary">1450</span>
                      <span className="text-muted">/1600</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-amber-600">
                      <span>🪙</span>
                      <span>994</span>
                    </div>
                    <Lumi pose="study" size={32} />
                  </div>
                </div>

                {/* Grid bên trong Mockup */}
                <div className="mt-5 grid grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
                  {/* Card 1: Daily Task */}
                  <div className="rounded-2xl border border-line bg-sunken/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink uppercase">Nhiệm vụ hôm nay</span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        2/3 hoàn thành
                      </span>
                    </div>
                    <ul className="mt-3 space-y-2 text-xs">
                      <li className="flex items-center gap-2 text-ink">
                        <CheckCircle2 size={15} className="text-success" />
                        <span className="line-through text-muted">Math: Phương trình bậc hai</span>
                      </li>
                      <li className="flex items-center gap-2 text-ink">
                        <CheckCircle2 size={15} className="text-success" />
                        <span className="line-through text-muted">10 từ vựng Reading context</span>
                      </li>
                      <li className="flex items-center gap-2 font-semibold text-primary">
                        <div className="size-3.5 rounded-full border-2 border-primary" />
                        <span>Mock Test Module 2 (Hard)</span>
                      </li>
                    </ul>
                  </div>

                  {/* Card 2: Weakness Analytics */}
                  <div className="rounded-2xl border border-line bg-sunken/40 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink uppercase">Phân tích kỹ năng</span>
                      <Wand2 size={15} className="text-primary" />
                    </div>
                    <div className="mt-3 space-y-2">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold">
                          <span>Algebra & Functions</span>
                          <span className="text-success">92%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200">
                          <div className="h-full w-[92%] rounded-full bg-success" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-bold">
                          <span>Boundaries & Transitions</span>
                          <span className="text-amber-500">68%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200">
                          <div className="h-full w-[68%] rounded-full bg-amber-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Streak & League */}
                  <div className="rounded-2xl border border-line bg-sunken/40 p-4 sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink uppercase">Chuỗi ngày học</span>
                      <span className="flex items-center gap-1 text-xs font-black text-accent-warm">
                        14 ngày 🔥
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-1">
                      {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d, i) => (
                        <div key={d} className="flex flex-col items-center gap-1">
                          <div
                            className={`size-6 rounded-full text-[10px] font-bold grid place-items-center ${
                              i < 5 ? "bg-amber-400 text-white" : "bg-slate-200 text-slate-500"
                            }`}
                          >
                            ✓
                          </div>
                          <span className="text-[10px] text-muted">{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            SECTION: DISTRACTION-FREE TEST ENVIRONMENT (Ảnh 5)
            ------------------------------------------------------------- */}
        <section id="environment" className="border-t border-line/60 bg-surface py-16 md:py-24">
          <div className="mx-auto max-w-[1180px] px-5">
            {/* Header section */}
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sunken px-3.5 py-1 text-xs font-extrabold text-primary">
                {isVi ? "THI THỬ THẬT →" : "TRY NOW →"}
              </span>
              <h2 className="font-display mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
                <span className="text-primary">Distraction-Free</span>{" "}
                {isVi ? "Môi trường thi chuẩn SAT" : "Test Environment"}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-body sm:text-base">
                {isVi
                  ? "Luyện tập với đầy đủ công cụ và giao diện chuẩn như ngày thi thật trên Bluebook — từ đồng hồ từng module, bảng công thức đến máy tính vẽ đồ thị Desmos tích hợp."
                  : "Practice with the exact same tools and interface you'll use on test day - from section timers to the Desmos calculator."}
              </p>
            </div>

            {/* Interactive Grid: 2 Cột giống Ảnh 5 */}
            <div className="mt-12 grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              {/* Cột trái: Feature selector pills */}
              <div className="space-y-3 lg:col-span-5">
                {FEATURE_TABS.map((tab, idx) => {
                  const Icon = tab.icon;
                  const active = activeFeature === idx;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveFeature(idx)}
                      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                        active
                          ? "border-primary bg-primary-soft/40 shadow-xs ring-2 ring-primary/20"
                          : "border-line bg-surface hover:border-primary/40 hover:bg-sunken/30"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`grid size-10 place-items-center rounded-xl ${
                            active ? "bg-primary text-white" : "bg-sunken text-muted"
                          }`}
                        >
                          <Icon size={20} />
                        </div>
                        <div>
                          <h3 className={`text-sm font-bold ${active ? "text-primary" : "text-ink"}`}>
                            {isVi ? tab.title : tab.titleEn}
                          </h3>
                          {active && (
                            <p className="mt-1 text-xs leading-relaxed text-muted line-clamp-2">
                              {tab.desc}
                            </p>
                          )}
                        </div>
                      </div>

                      <div
                        className={`grid size-7 place-items-center rounded-full ${
                          active ? "border-2 border-primary text-primary" : "text-slate-300"
                        }`}
                      >
                        <Play size={12} className={active ? "fill-current" : ""} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Cột phải: Screen Mockup phòng thi Bluebook + AI assistant drawer (Ảnh 5) */}
              <div className="lg:col-span-7">
                <div className="overflow-hidden rounded-3xl border-8 border-slate-800 bg-slate-900 shadow-2xl">
                  {/* Browser / Test Header */}
                  <div className="flex items-center justify-between bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full bg-rose-500" />
                      <span className="size-3 rounded-full bg-amber-500" />
                      <span className="size-3 rounded-full bg-emerald-500" />
                      <span className="ml-2 font-mono text-[11px] text-slate-400">
                        HocSAT Bluebook Proctor v2.4
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="rounded-md bg-slate-700 px-2 py-0.5 font-mono text-white">
                        28:45
                      </span>
                      <Calculator size={16} className="text-slate-300" />
                    </div>
                  </div>

                  {/* 2-Pane Test Interface (Ảnh 5) */}
                  <div className="grid grid-cols-1 bg-white md:grid-cols-12">
                    {/* Pane trái (6/12): Đề thi SAT */}
                    <div className="border-b border-line p-5 md:col-span-7 md:border-r md:border-b-0">
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span className="font-bold">Module 1: Math (Hard)</span>
                        <span className="rounded-md bg-sunken px-2 py-0.5 font-bold text-primary">
                          Câu 14 / 22
                        </span>
                      </div>

                      <div className="mt-4">
                        <p className="font-mono text-sm font-semibold text-ink">
                          (x - 3)² + (y + 6)² = 81
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-body">
                          Phương trình đường tròn trong mặt phẳng xy như trên. Đâu là bán kính và toạ
                          độ tâm đường tròn?
                        </p>
                      </div>

                      {/* 4 phương án lựa chọn */}
                      <div className="mt-4 space-y-2">
                        {[
                          "A. Tâm (3, -6), bán kính 9",
                          "B. Tâm (-3, 6), bán kính 9",
                          "C. Tâm (3, -6), bán kính 81",
                          "D. Tâm (-3, 6), bán kính 81",
                        ].map((choice, i) => (
                          <div
                            key={choice}
                            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                              i === 0
                                ? "border-primary bg-primary-soft/50 text-primary font-bold"
                                : "border-line text-body"
                            }`}
                          >
                            {choice}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pane phải (5/12): AI Assistant drawer (Ảnh 5) */}
                    <div className="flex flex-col justify-between bg-slate-50 p-4 md:col-span-5">
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                          <Bot size={15} />
                          <span>Trợ lý AI phòng thi</span>
                        </div>

                        {/* Chat bubble người dùng */}
                        <div className="ml-auto max-w-[90%] rounded-2xl rounded-tr-xs bg-primary p-3 text-xs text-white shadow-xs">
                          {isVi
                            ? "Gợi ý cho em phương pháp giải câu này với ạ?"
                            : "Please give me a small hint to answer this question."}
                        </div>

                        {/* Bot response */}
                        <div className="mr-auto max-w-[95%] rounded-2xl rounded-tl-xs border border-line bg-white p-3 text-xs text-body shadow-xs">
                          <p className="font-semibold text-primary">Gợi ý từ AI:</p>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted">
                            Phương trình chuẩn đường tròn có dạng:
                            <br />
                            <code className="font-bold text-ink">(x - h)² + (y - k)² = R²</code>
                            <br />
                            Ở đây R² = 81, do đó bán kính R = √81 = 9.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-line bg-white p-2 text-center text-[11px] font-medium text-muted">
                        AI đang hỗ trợ làm bài...
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            SECTION: CÁC TÍNH NĂNG CỐT LÕI (Bento Grid)
            ------------------------------------------------------------- */}
        <section id="features" className="py-16 md:py-24">
          <div className="mx-auto max-w-[1180px] px-5">
            <div className="text-center">
              <Badge tone="brand" className="rounded-full">
                {t.featuresHeading}
              </Badge>
              <h2 className="font-display mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
                Xây dựng chuẩn mực cho trung tâm luyện thi SAT
              </h2>
              <p className="mt-2 text-sm text-muted">{t.featuresSub}</p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {t.features.map((f) => (
                <Card
                  key={f.key}
                  className="rounded-[var(--radius-xl)] border-line/80 p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-soft-md"
                >
                  <div className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary shadow-xs">
                    {f.icon === "assignment" && <ClipboardList size={22} />}
                    {f.icon === "quiz" && <ListChecks size={22} />}
                    {f.icon === "analytics" && <BarChart3 size={22} />}
                    {f.icon === "attendance" && <CalendarCheck size={22} />}
                    {f.icon === "materials" && <BookOpen size={22} />}
                    {f.icon === "exam" && <ShieldCheck size={22} />}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold text-ink">{f.title}</h3>
                    {f.soon && <Badge tone="accent">{t.soonLabel}</Badge>}
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-muted">{f.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            SECTION: DÀNH CHO AI (Audience)
            ------------------------------------------------------------- */}
        <section id="audience" className="border-t border-line/60 bg-surface py-16">
          <div className="mx-auto max-w-[1180px] px-5">
            <h2 className="font-display text-center text-3xl font-black text-ink sm:text-4xl">
              {t.audienceHeading}
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {t.audiences.map((a) => (
                <div key={a.key} className="rounded-2xl border border-line bg-sunken/40 p-6">
                  <h3 className="font-display text-lg font-bold text-ink">{a.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted">{a.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            CLOSING CTA & FOOTER
            ------------------------------------------------------------- */}
        <section className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 py-16 text-center text-white">
          <div className="mx-auto max-w-[640px] px-5">
            <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
              {t.closing.title}
            </h2>
            <p className="mt-3 text-sm text-blue-100">{t.closing.body}</p>

            <Link href="/login" className="mt-8 inline-block">
              <button
                type="button"
                className="rounded-full bg-white px-8 py-3.5 text-sm font-black text-blue-600 shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                {t.closing.cta}
              </button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface py-8 text-center text-xs text-muted">
        <div className="mx-auto max-w-[1180px] px-5">
          <p>{t.footer}</p>
        </div>
      </footer>
    </div>
  );
}
