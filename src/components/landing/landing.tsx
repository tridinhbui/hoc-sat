"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bot,
  Calculator,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Flame,
  Gauge,
  History,
  Layers,
  ListChecks,
  MessageSquare,
  Play,
  Quote,
  ShieldCheck,
  Sliders,
  Sparkles,
  Star,
  TrendingUp,
  Wand2,
} from "lucide-react";

import { COPY } from "@/lib/landing/content";
import { LeagueShield, Lumi } from "@/components/mascot/lumi";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LanguageToggle } from "./language-toggle";
import { Reveal } from "./reveal";
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

const TESTIMONIALS = [
  {
    name: "Nguyễn Minh Quân",
    school: "VinUni (Học bổng 90%)",
    initialScore: "1260",
    finalScore: "1540",
    gain: "+280",
    avatar: "MQ",
    quote:
      "Phần phân tích bẫy đề Math và gợi ý bước giải của AI thực sự đỉnh cao. Mình làm bài thi thử trên HocSAT bấm giờ đúng từng giây như thi thật trên Bluebook nên vào phòng thi không hề bị tâm lý.",
  },
  {
    name: "Trần Phương Linh",
    school: "Fulbright University Vietnam",
    initialScore: "1220",
    finalScore: "1510",
    gain: "+290",
    avatar: "PL",
    quote:
      "Sổ câu sai tự động phân loại đúng mảng mình hay nhầm ở Reading & Writing (Craft & Structure). Luyện lặp lại ngắt quãng 7 ngày giúp mình nhớ kiến thức sâu hơn hẳn học thuộc lòng.",
  },
  {
    name: "Thầy Lê Đức Minh",
    school: "Giáo viên SAT 8 năm kinh nghiệm",
    initialScore: "Học sinh lớp 11",
    finalScore: "TB 1480+",
    gain: "92% đỗ mục tiêu",
    avatar: "ĐM",
    quote:
      "Tiết kiệm 80% thời gian chấm trắc nghiệm và điểm danh. Bảng Heatmap câu sai giúp tôi nhìn phát là biết hôm nay cả lớp vướng chỗ nào để chữa bài trọng tâm thay vì giảng lại lan man.",
  },
];

const FAQS = [
  {
    q: "Đề thi và công cụ trên HocSAT có bám sát đề thi thật của College Board không?",
    a: "100% bám sát. Cấu trúc bài thi chia đúng 2 Module Math (35 phút/22 câu) và 2 Module Reading & Writing (32 phút/27 câu), tích hợp máy tính đồ họa Desmos chuẩn quốc tế và bảng công thức tham chiếu.",
  },
  {
    q: "Hệ thống chấm các câu hỏi điền số (Grid-in) trong đề Math như thế nào?",
    a: "HocSAT sử dụng bộ chuẩn hoá toán học chuẩn College Board: chấp nhận phân số 3/4, số thập phân .75 và 0.75 đều đúng. Với số thập phân vô hạn như 2/3, hệ thống chấp nhận cả làm tròn và cắt 3 chữ số (.666 và .667).",
  },
  {
    q: "Trung tâm hoặc lớp học có thể quản lý nhiều học sinh cùng lúc không?",
    a: "Có. Giáo viên và trợ giảng có dashboard riêng theo dõi chuyên cần theo từng buổi, heatmap phân tích câu sai của cả lớp, xuất báo cáo CSV điểm số và gửi email tự động trả bài cho học sinh.",
  },
  {
    q: "Phòng thi thử có chế độ khoá màn hình chống gian lận (Lockdown) không?",
    a: "Có. Giao diện phòng thi tự động ghi nhận các sự kiện thoát toàn màn hình, chuyển tab trình duyệt, copy/paste và mở DevTools để giáo viên có dữ liệu giám sát minh bạch.",
  },
  {
    q: "Làm thế nào để tạo tài khoản cho học sinh và giáo viên?",
    a: "Tài khoản do trung tâm giáo dục cấp từ trang Quản trị (hỗ trợ thêm từng tài khoản hoặc import danh sách CSV). Hệ thống tự sinh mật khẩu tạm và gửi thông tin đăng nhập trực tiếp qua email.",
  },
];

export function Landing() {
  const [locale, setLocale] = useLocale();
  const [activeFeature, setActiveFeature] = useState(0);
  const [currentScore, setCurrentScore] = useState(1120);
  const [targetScore, setTargetScore] = useState(1480);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const currentScoreInputId = useId();
  const targetScoreInputId = useId();

  useEffect(() => {
    document.documentElement.lang = COPY[locale].htmlLang;
  }, [locale]);

  const t = COPY[locale];
  const isVi = locale === "vi";

  const scoreDiff = Math.max(0, targetScore - currentScore);
  const estimatedWeeks = Math.max(4, Math.round(scoreDiff / 45));

  const targetSchool =
    targetScore >= 1530
      ? "Ivy League, MIT, Stanford, Harvard, VinUni Elite"
      : targetScore >= 1450
        ? "VinUni (Học bổng cao), Fulbright, Top 30 US, NUS/NTU Singapore"
        : targetScore >= 1350
          ? "RMIT Vietnam, BUV, Đại học Quốc gia, FTU tuyển thẳng"
          : "Các trường đại học quốc tế & đại học top đầu trong nước";

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
            <ChevronRight
              size={14}
              className="text-slate-400 transition-transform group-hover:translate-x-0.5"
            />
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
            <a href="#simulator" className="transition-colors hover:text-primary">
              {isVi ? "Ước tính điểm" : "Score Calculator"}
            </a>
            <a href="#environment" className="transition-colors hover:text-primary">
              {isVi ? "Phòng thi Bluebook" : "Test Environment"}
            </a>
            <a href="#error-bank" className="transition-colors hover:text-primary">
              {isVi ? "Sổ câu sai AI" : "Error Bank"}
            </a>
            <a href="#gamification" className="transition-colors hover:text-primary">
              {isVi ? "Gamification" : "Rewards"}
            </a>
            <a href="#testimonials" className="transition-colors hover:text-primary">
              {isVi ? "Học sinh 1500+" : "Results"}
            </a>
            <a href="#faq" className="transition-colors hover:text-primary">
              {isVi ? "Hỏi đáp" : "FAQ"}
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
            HERO SECTION VỚI FLOATING BADGES & 3D MOCKUP (Ảnh 4)
            ------------------------------------------------------------- */}
        <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
          {/* Vòng sáng nền mờ */}
          <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-[680px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-blue-400/20 to-indigo-500/20 blur-3xl" />

          {/* Floating Badges hai bên (Animation ảo diệu) */}
          <div className="pointer-events-none absolute top-24 left-6 hidden lg:block xl:left-14">
            <div className="animate-float rounded-2xl border border-line bg-surface/90 p-3 shadow-soft backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-orange-100 text-sm font-bold text-orange-600">
                  🔥
                </span>
                <div>
                  <p className="text-[11px] font-bold text-ink">Streak 14 ngày</p>
                  <p className="text-[10px] text-muted">Thắp sáng ngọn lửa</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute top-28 right-6 hidden lg:block xl:right-14">
            <div className="animate-float-delayed rounded-2xl border border-line bg-surface/90 p-3 shadow-soft backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-600">
                  📈
                </span>
                <div>
                  <p className="text-[11px] font-bold text-ink">+280 Điểm SAT</p>
                  <p className="text-[10px] text-muted">Bứt phá điểm trung bình</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[980px] px-5 text-center">
            {/* Title */}
            <Reveal direction="up">
              <h1 className="font-display text-4xl font-black tracking-tight text-ink sm:text-5xl md:text-6xl md:leading-[1.15]">
                {isVi ? "Luyện thi Digital SAT® thông minh," : "HocSAT AI for Digital SAT® Prep,"}
                <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
                  {isVi ? "Nhẹ nhàng & Đột phá điểm số" : "Fun and Easy"}
                </span>
              </h1>
            </Reveal>

            {/* Subtitle */}
            <Reveal direction="up" delay={150}>
              <p className="mx-auto mt-6 max-w-[680px] text-base leading-relaxed text-body md:text-lg">
                {isVi
                  ? "HocSAT AI thấu hiểu phong cách học của bạn ❖ — liên tục thích ứng câu hỏi, phân tích điểm mù và tối ưu chiến thuật để bứt phá mục tiêu 1400+ và 1500+ nhanh nhất 🚀"
                  : "HocSAT AI learns how you learn ❖ — adapting questions, pacing, and strategy to close your gaps faster 🚀"}
              </p>
            </Reveal>

            {/* CTAs */}
            <Reveal direction="up" delay={250}>
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

                <a href="#simulator">
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full border border-line-strong/80 bg-surface px-7 py-3.5 text-sm font-bold text-ink shadow-xs transition-all hover:bg-sunken hover:-translate-y-0.5"
                  >
                    <Sliders size={16} className="text-primary" />
                    <span>{isVi ? "Tính điểm mục tiêu" : "Simulate Score"}</span>
                  </button>
                </a>
              </div>
            </Reveal>

            {/* -------------------------------------------------------------
                FLOATING 3D DASHBOARD PREVIEW (Ảnh 4)
                ------------------------------------------------------------- */}
            <Reveal direction="up" delay={350}>
              <div className="relative mx-auto mt-14 max-w-[940px] px-2">
                <div className="rounded-3xl border border-line/80 bg-surface p-4 shadow-soft-lg ring-8 ring-blue-50/50 transition-all hover:shadow-soft-lg hover:ring-blue-100/60 md:p-6">
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
                    <div className="rounded-2xl border border-line bg-sunken/40 p-4 transition-transform hover:-translate-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink uppercase">Nhiệm vụ hôm nay</span>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          2/3 hoàn thành
                        </span>
                      </div>
                      <ul className="mt-3 space-y-2 text-xs">
                        <li className="flex items-center gap-2 text-ink">
                          <CheckCircle2 size={15} className="text-success shrink-0" />
                          <span className="line-through text-muted">Math: Phương trình bậc hai</span>
                        </li>
                        <li className="flex items-center gap-2 text-ink">
                          <CheckCircle2 size={15} className="text-success shrink-0" />
                          <span className="line-through text-muted">10 từ vựng Reading context</span>
                        </li>
                        <li className="flex items-center gap-2 font-semibold text-primary">
                          <div className="size-3.5 shrink-0 rounded-full border-2 border-primary" />
                          <span>Mock Test Module 2 (Hard)</span>
                        </li>
                      </ul>
                    </div>

                    {/* Card 2: Weakness Analytics */}
                    <div className="rounded-2xl border border-line bg-sunken/40 p-4 transition-transform hover:-translate-y-0.5">
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
                    <div className="rounded-2xl border border-line bg-sunken/40 p-4 transition-transform hover:-translate-y-0.5 sm:col-span-2 lg:col-span-1">
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
                                i < 5 ? "bg-amber-400 text-white shadow-xs" : "bg-slate-200 text-slate-500"
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
            </Reveal>
          </div>
        </section>

        {/* -------------------------------------------------------------
            SECTION ĐAN XEN 1: INTERACTIVE SCORE SIMULATOR (MỚI)
            ------------------------------------------------------------- */}
        <section id="simulator" className="border-t border-line/60 bg-gradient-to-b from-surface via-blue-50/20 to-surface py-16 md:py-24">
          <div className="mx-auto max-w-[1180px] px-5">
            <Reveal direction="up">
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3.5 py-1 text-xs font-extrabold text-blue-700">
                  <Gauge size={14} /> CÔNG CỤ TÍNH LỘ TRÌNH
                </span>
                <h2 className="font-display mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
                  Mô phỏng Lộ trình Bứt phá Điểm SAT
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
                  Kéo thanh điểm để xem thời gian học dự kiến, mục tiêu tuần và các trường đại học bạn có thể chạm tới.
                </p>
              </div>
            </Reveal>

            <Reveal direction="up" delay={200}>
              <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-line bg-surface p-6 shadow-soft-md md:p-8">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  {/* Slider 1: Điểm hiện tại */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-bold">
                      <label htmlFor={currentScoreInputId} className="text-muted">Điểm hiện tại của bạn:</label>
                      <span className="font-display text-xl text-ink">{currentScore}</span>
                    </div>
                    <input
                      id={currentScoreInputId}
                      type="range"
                      min={900}
                      max={1400}
                      step={10}
                      value={currentScore}
                      onChange={(e) => setCurrentScore(Number(e.target.value))}
                      className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-sunken accent-primary"
                    />
                    <div className="flex justify-between text-[11px] font-semibold text-muted">
                      <span>900</span>
                      <span>1150</span>
                      <span>1400</span>
                    </div>
                  </div>

                  {/* Slider 2: Điểm mục tiêu */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-bold">
                      <label htmlFor={targetScoreInputId} className="text-muted">Điểm mục tiêu mong muốn:</label>
                      <span className="font-display text-xl text-primary">{targetScore}</span>
                    </div>
                    <input
                      id={targetScoreInputId}
                      type="range"
                      min={1200}
                      max={1580}
                      step={10}
                      value={targetScore}
                      onChange={(e) => setTargetScore(Number(e.target.value))}
                      className="h-2.5 w-full cursor-pointer appearance-none rounded-full bg-sunken accent-primary"
                    />
                    <div className="flex justify-between text-[11px] font-semibold text-muted">
                      <span>1200</span>
                      <span>1450</span>
                      <span>1580</span>
                    </div>
                  </div>
                </div>

                {/* Kết quả tính toán trực quan */}
                <div className="mt-8 rounded-2xl bg-sunken/60 p-5">
                  <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
                    <div className="border-b border-line/70 pb-3 sm:border-r sm:border-b-0 sm:pb-0">
                      <p className="text-xs font-semibold text-muted">Mức tăng điểm</p>
                      <p className="font-display mt-1 text-2xl font-black text-emerald-600">
                        +{scoreDiff} Điểm
                      </p>
                    </div>
                    <div className="border-b border-line/70 pb-3 sm:border-r sm:border-b-0 sm:pb-0">
                      <p className="text-xs font-semibold text-muted">Thời gian ước tính</p>
                      <p className="font-display mt-1 text-2xl font-black text-primary">
                        ~{estimatedWeeks} Tuần
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted">Số câu hỏi mỗi ngày</p>
                      <p className="font-display mt-1 text-2xl font-black text-ink">
                        15 - 20 Câu
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-line/60 pt-4 text-center">
                    <p className="text-xs font-bold text-muted uppercase">Mục tiêu trường đại học phù hợp:</p>
                    <p className="mt-1 text-sm font-bold text-ink">{targetSchool}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* -------------------------------------------------------------
            SECTION: DISTRACTION-FREE TEST ENVIRONMENT (Ảnh 5)
            ------------------------------------------------------------- */}
        <section id="environment" className="border-t border-line/60 bg-surface py-16 md:py-24">
          <div className="mx-auto max-w-[1180px] px-5">
            {/* Header section */}
            <Reveal direction="up">
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
            </Reveal>

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
                <Reveal direction="left" delay={150}>
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
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            SECTION ĐAN XEN 2: SMART ERROR BANK & WEAKNESS DIAGNOSIS (MỚI)
            ------------------------------------------------------------- */}
        <section id="error-bank" className="border-t border-line/60 bg-gradient-to-b from-bg to-surface py-16 md:py-24">
          <div className="mx-auto max-w-[1180px] px-5">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
              {/* Cột trái: Nội dung thuyết phục */}
              <div className="space-y-5 lg:col-span-6">
                <Reveal direction="up">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3.5 py-1 text-xs font-extrabold text-rose-700">
                    <History size={14} /> SỔ TAY CÂU SAI THÔNG MINH
                  </span>
                  <h2 className="font-display mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
                    Không bao giờ ngã ở cùng một cái bẫy đề thi
                  </h2>
                  <p className="text-sm leading-relaxed text-body sm:text-base">
                    Làm nhiều đề không bằng chữa kỹ từng câu sai. HocSAT tự động gom mọi lỗi sai của học sinh vào kho lưu trữ chuyên biệt, áp dụng thuật toán lặp lại ngắt quãng để đảm bảo kiến thức được khắc sâu.
                  </p>
                </Reveal>

                <Reveal direction="up" delay={200}>
                  <div className="space-y-3.5 pt-2">
                    <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-2xs">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600">
                        <Wand2 size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-ink">Tự động gắn tag lý do sai</h3>
                        <p className="mt-0.5 text-xs text-muted">
                          Phân loại chính xác: bẫy từ đồng nghĩa, lỗi tính toán nhầm, hay thiếu hụt công thức lý thuyết.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-2xs">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-600">
                        <TrendingUp size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-ink">Spaced Repetition (Lặp lại ngắt quãng)</h3>
                        <p className="mt-0.5 text-xs text-muted">
                          Câu sai sẽ tự động xuất hiện lại vào ngày thứ 3 và ngày thứ 7 dưới dạng biến thể mới để kiểm tra độ hiểu sâu.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-2xs">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                        <BarChart3 size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-ink">Heatmap lớp học cho giáo viên</h3>
                        <p className="mt-0.5 text-xs text-muted">
                          Thống kê câu hỏi nào cả lớp cùng sai nhiều nhất để giáo viên tập trung thời lượng buổi học chữa đúng điểm yếu.
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* Cột phải: Visual Mockup thẻ câu sai thông minh */}
              <div className="lg:col-span-6">
                <Reveal direction="right" delay={250}>
                  <Card className="rounded-3xl border-line/80 bg-surface p-6 shadow-soft-lg">
                    <div className="flex items-center justify-between border-b border-line/70 pb-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-600">
                        <span className="size-2.5 rounded-full bg-rose-500 animate-ping" />
                        <span>CẦN ÔN LẠI (NGÀY THỨ 3)</span>
                      </div>
                      <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-bold text-muted">
                        Module 2 Math
                      </span>
                    </div>

                    <div className="mt-4 rounded-2xl bg-sunken/50 p-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-ink">Dạng bài: Quadratic Equations</span>
                        <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                          Lỗi: Quên nghiệm âm
                        </span>
                      </div>
                      <p className="mt-2.5 font-mono text-xs text-ink">
                        |2x - 4| = 12. Tìm tích của tất cả các giá trị của x thoả mãn?
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <span className="rounded-md bg-rose-100 px-2 py-1 font-bold text-rose-600">
                          ✕ Lần 1: Chọn x = 8
                        </span>
                        <span className="rounded-md bg-emerald-100 px-2 py-1 font-bold text-emerald-700">
                          ✓ Đúng: x = 8 hoặc x = -4 → Tích = -32
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                        <span>Tiến độ khắc phục:</span>
                        <span className="font-bold text-emerald-600">Đã ôn 2/3 lần</span>
                      </div>
                      <button
                        type="button"
                        className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-primary-hover"
                      >
                        Làm câu biến thể tương tự →
                      </button>
                    </div>
                  </Card>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            SECTION ĐAN XEN 3: GAMIFICATION & HABIT LOOP (Ảnh 1)
            ------------------------------------------------------------- */}
        <section id="gamification" className="border-t border-line/60 bg-surface py-16 md:py-24">
          <div className="mx-auto max-w-[1180px] px-5">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
              {/* Cột trái: Visual Gamification Chests & Badges (Ảnh 1) */}
              <div className="lg:col-span-6">
                <Reveal direction="left">
                  <div className="space-y-4">
                    {/* Banners Gamification giống ảnh 1 */}
                    <div className="rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400 p-6 text-white shadow-soft">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase">
                            GIỚI HẠN TUẦN NÀY
                          </span>
                          <h3 className="font-display mt-2 text-2xl font-black">Khung Avatar Lumi</h3>
                          <p className="mt-1 text-xs text-blue-100">
                            Hoàn thành 30 câu hỏi để mở khóa khung avatar cáo cam độc quyền!
                          </p>
                        </div>
                        <Lumi pose="study" size={70} className="shrink-0" />
                      </div>
                    </div>

                    {/* Hàng 2 rương thưởng Mini Chest & Lucky Chest */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-line bg-sunken/40 p-4 text-center transition-transform hover:-translate-y-0.5">
                        <span className="text-3xl">📦</span>
                        <h4 className="mt-2 text-xs font-bold text-ink">Rương Nhỏ</h4>
                        <p className="text-[10px] text-muted">Phần thưởng cơ bản</p>
                        <div className="mt-3 flex items-center justify-center gap-1 text-xs font-bold text-amber-600">
                          <span>🪙 50 Xu</span>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/60 to-white p-4 text-center transition-transform hover:-translate-y-0.5 shadow-xs">
                        <span className="text-3xl">🎁</span>
                        <h4 className="mt-2 text-xs font-bold text-ink">Rương May Mắn</h4>
                        <p className="text-[10px] text-muted">Tỉ lệ rơi đồ hiếm cao</p>
                        <div className="mt-3 flex items-center justify-center gap-1 text-xs font-bold text-amber-600">
                          <span>🪙 150 Xu</span>
                        </div>
                      </div>
                    </div>

                    {/* Huy hiệu League */}
                    <div className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4">
                      <div className="flex items-center gap-3">
                        <LeagueShield tier="gold" size={44} />
                        <div>
                          <p className="text-xs font-bold text-ink">Bảng Vàng (Gold League)</p>
                          <p className="text-[11px] text-muted">Top 5% học sinh chăm chỉ nhất toàn quốc</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                        Hạng #12
                      </span>
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* Cột phải: Text giới thiệu Gamification */}
              <div className="space-y-5 lg:col-span-6">
                <Reveal direction="up" delay={200}>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1 text-xs font-extrabold text-amber-700">
                    <Flame size={14} /> GAMIFICATION & THÓI QUEN
                  </span>
                  <h2 className="font-display mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
                    Học SAT nhưng nghiện như chơi game
                  </h2>
                  <p className="text-sm leading-relaxed text-body sm:text-base">
                    Lý do lớn nhất khiến học sinh bỏ cuộc không phải vì đề SAT quá khó, mà vì sự nhàm chán khi tự học một mình. HocSAT biến mỗi buổi học thành một cuộc phiêu lưu săn điểm thú vị.
                  </p>
                </Reveal>

                <Reveal direction="up" delay={300}>
                  <div className="space-y-4 pt-2">
                    <div className="flex items-start gap-3.5">
                      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-orange-100 font-bold text-orange-600">
                        1
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-ink">Chuỗi ngày học (Daily Streak)</h3>
                        <p className="text-xs text-muted">
                          Chỉ cần 5 câu mỗi ngày để giữ ngọn lửa không bị tắt. Học một chút mỗi ngày hiệu quả gấp 5 lần cày dồn vào cuối tuần.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5">
                      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-100 font-bold text-blue-600">
                        2
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-ink">Hệ thống giải đấu xếp hạng (Weekly Leagues)</h3>
                        <p className="text-xs text-muted">
                          Thi đấu trong nhóm 30 bạn cùng trình độ. Trả lời đúng nhiều câu để thăng hạng từ Đồng lên Bạc, Vàng và Kim Cương.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5">
                      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-purple-100 font-bold text-purple-600">
                        3
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-ink">Cửa hàng phần thưởng & Khung Avatar</h3>
                        <p className="text-xs text-muted">
                          Tích lũy xu vàng để mở rương, sưu tầm khung avatar vinh danh điểm số 1400, 1500, 1600.
                        </p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            SECTION ĐAN XEN 4: BẢNG SO SÁNH PHƯƠNG PHÁP (MỚI)
            ------------------------------------------------------------- */}
        <section className="border-t border-line/60 bg-bg py-16 md:py-24">
          <div className="mx-auto max-w-[1080px] px-5">
            <Reveal direction="up">
              <div className="text-center">
                <Badge tone="brand" className="rounded-full">
                  SO SÁNH HIỆU QUẢ
                </Badge>
                <h2 className="font-display mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
                  Vì sao chọn HocSAT thay vì cách học truyền thống?
                </h2>
              </div>
            </Reveal>

            <Reveal direction="up" delay={200}>
              <div className="mt-10 overflow-hidden rounded-3xl border border-line bg-surface shadow-soft">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-line bg-sunken/50 text-ink">
                        <th className="p-4 font-bold">Tiêu chí</th>
                        <th className="p-4 font-semibold text-muted">Sách giấy / File PDF</th>
                        <th className="p-4 font-semibold text-muted">Web trắc nghiệm thường</th>
                        <th className="p-4 font-black text-primary">HocSAT.ai LMS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      <tr>
                        <td className="p-4 font-bold text-ink">Giao diện thi Bluebook</td>
                        <td className="p-4 text-rose-500">❌ Hoàn toàn không có</td>
                        <td className="p-4 text-amber-600">⚠️ Form trắc nghiệm thô sơ</td>
                        <td className="p-4 font-bold text-primary">✅ Chuẩn 1:1 College Board</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold text-ink">Chấm câu điền số Grid-in</td>
                        <td className="p-4 text-rose-500">❌ Phải tự tra đáp án</td>
                        <td className="p-4 text-amber-600">⚠️ Hay chấm sai phân số</td>
                        <td className="p-4 font-bold text-primary">✅ Chuẩn xác phân số/thập phân</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold text-ink">Máy tính đồ họa Desmos</td>
                        <td className="p-4 text-rose-500">❌ Phải mở tab ngoài</td>
                        <td className="p-4 text-rose-500">❌ Không tích hợp</td>
                        <td className="p-4 font-bold text-primary">✅ Tích hợp trực tiếp trong bài</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold text-ink">Phân tích bẫy đề câu sai</td>
                        <td className="p-4 text-rose-500">❌ Tự ghi chép giấy</td>
                        <td className="p-4 text-muted">Chỉ hiện đáp án đúng</td>
                        <td className="p-4 font-bold text-primary">✅ AI gợi ý bước giải & bẫy đề</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-bold text-ink">Duy trì thói quen học</td>
                        <td className="p-4 text-rose-500">❌ 80% bỏ cuộc sau 2 tuần</td>
                        <td className="p-4 text-muted">Không có động lực</td>
                        <td className="p-4 font-bold text-primary">✅ Chuỗi Streak, League, Rương thưởng</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* -------------------------------------------------------------
            SECTION: CÁC TÍNH NĂNG CỐT LÕI (Bento Grid)
            ------------------------------------------------------------- */}
        <section id="features" className="border-t border-line/60 bg-surface py-16 md:py-24">
          <div className="mx-auto max-w-[1180px] px-5">
            <Reveal direction="up">
              <div className="text-center">
                <Badge tone="brand" className="rounded-full">
                  {t.featuresHeading}
                </Badge>
                <h2 className="font-display mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
                  Xây dựng chuẩn mực cho trung tâm luyện thi SAT
                </h2>
                <p className="mt-2 text-sm text-muted">{t.featuresSub}</p>
              </div>
            </Reveal>

            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {t.features.map((f, i) => (
                <Reveal key={f.key} direction="up" delay={i * 100}>
                  <Card className="h-full rounded-[var(--radius-xl)] border-line/80 p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-soft-md">
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
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            SECTION ĐAN XEN 5: TESTIMONIALS & CA SĨ ĐIỂM CAO 1500+ (MỚI)
            ------------------------------------------------------------- */}
        <section id="testimonials" className="border-t border-line/60 bg-gradient-to-b from-surface to-bg py-16 md:py-24">
          <div className="mx-auto max-w-[1180px] px-5">
            <Reveal direction="up">
              <div className="text-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-extrabold text-emerald-700">
                  <Star size={13} className="fill-current" /> HỌC SINH 1500+ NÓI GÌ
                </span>
                <h2 className="font-display mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
                  Bứt phá mục tiêu điểm số cùng HocSAT.ai
                </h2>
              </div>
            </Reveal>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t, idx) => (
                <Reveal key={t.name} direction="up" delay={idx * 150}>
                  <Card className="flex h-full flex-col justify-between rounded-3xl border-line/80 bg-surface p-6 shadow-soft transition-all hover:shadow-soft-md">
                    <div>
                      <Quote size={24} className="text-primary/30" />
                      <p className="mt-3 text-xs leading-relaxed text-body italic">
                        &ldquo;{t.quote}&rdquo;
                      </p>
                    </div>

                    <div className="mt-6 border-t border-line/70 pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="grid size-10 place-items-center rounded-full bg-primary-soft font-bold text-primary">
                            {t.avatar}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-ink">{t.name}</p>
                            <p className="text-[11px] text-muted">{t.school}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-display block text-sm font-black text-primary">
                            {t.finalScore}
                          </span>
                          <span className="block text-[10px] font-bold text-emerald-600">
                            {t.gain}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            SECTION ĐAN XEN 6: FAQ ACCORDION (MỚI)
            ------------------------------------------------------------- */}
        <section id="faq" className="border-t border-line/60 bg-surface py-16 md:py-24">
          <div className="mx-auto max-w-[860px] px-5">
            <Reveal direction="up">
              <div className="text-center">
                <Badge tone="brand" className="rounded-full">
                  GIẢI ĐÁP THẮC MẮC
                </Badge>
                <h2 className="font-display mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
                  Câu hỏi thường gặp về HocSAT
                </h2>
              </div>
            </Reveal>

            <div className="mt-10 space-y-3">
              {FAQS.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <Reveal key={faq.q} direction="up" delay={index * 80}>
                    <div className="overflow-hidden rounded-2xl border border-line bg-surface transition-all">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-sunken/40"
                      >
                        <span className="text-sm font-bold text-ink pr-4">{faq.q}</span>
                        {isOpen ? (
                          <ChevronUp size={18} className="shrink-0 text-primary" />
                        ) : (
                          <ChevronDown size={18} className="shrink-0 text-muted" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="border-t border-line/60 bg-sunken/20 px-5 py-4 text-xs leading-relaxed text-body">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            SECTION: DÀNH CHO AI (Audience)
            ------------------------------------------------------------- */}
        <section id="audience" className="border-t border-line/60 bg-bg py-16">
          <div className="mx-auto max-w-[1180px] px-5">
            <Reveal direction="up">
              <h2 className="font-display text-center text-3xl font-black text-ink sm:text-4xl">
                {t.audienceHeading}
              </h2>
            </Reveal>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
              {t.audiences.map((a, i) => (
                <Reveal key={a.key} direction="up" delay={i * 120}>
                  <div className="h-full rounded-2xl border border-line bg-surface p-6 shadow-soft transition-all hover:shadow-soft-md">
                    <h3 className="font-display text-lg font-bold text-ink">{a.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted">{a.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            CLOSING CTA & FOOTER
            ------------------------------------------------------------- */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 py-20 text-center text-white">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/15 via-transparent to-transparent opacity-60" />

          <Reveal direction="up">
            <div className="mx-auto max-w-[680px] px-5">
              <div className="flex justify-center">
                <Lumi pose="study" size={80} className="drop-shadow-lg" />
              </div>
              <h2 className="font-display mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                {t.closing.title}
              </h2>
              <p className="mt-3 text-sm text-blue-100 md:text-base">{t.closing.body}</p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/login">
                  <button
                    type="button"
                    className="rounded-full bg-white px-8 py-3.5 text-sm font-black text-blue-600 shadow-xl transition-all hover:scale-105 hover:bg-blue-50 active:scale-95"
                  >
                    {t.closing.cta}
                  </button>
                </Link>
              </div>

              <div className="mt-8 flex items-center justify-center gap-6 text-xs text-blue-200">
                <span className="flex items-center gap-1.5">
                  <Check size={14} /> 7,000+ Câu hỏi
                </span>
                <span className="flex items-center gap-1.5">
                  <Check size={14} /> Chuẩn đề Bluebook
                </span>
                <span className="flex items-center gap-1.5">
                  <Check size={14} /> Máy tính Desmos
                </span>
              </div>
            </div>
          </Reveal>
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
