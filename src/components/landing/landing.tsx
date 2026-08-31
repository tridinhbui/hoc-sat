"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { COPY } from "@/lib/landing/content";
import { Badge } from "@/components/ui/badge";
import { LanguageToggle } from "./language-toggle";
import { Reveal } from "./reveal";
import { useLocale } from "./use-locale";



const FAQS = [
  {
    q: "Đề thi và công cụ trên AtlasSAT có bám sát đề thi thật của College Board không?",
    a: "100% bám sát. Cấu trúc bài thi chia đúng 2 Module Math (35 phút/22 câu) và 2 Module Reading & Writing (32 phút/27 câu), tích hợp máy tính đồ họa Desmos chuẩn quốc tế và bảng công thức tham chiếu.",
  },
  {
    q: "Hệ thống chấm các câu hỏi điền số (Grid-in) trong đề Math như thế nào?",
    a: "AtlasSAT sử dụng bộ chuẩn hoá toán học chuẩn College Board: chấp nhận phân số 3/4, số thập phân .75 và 0.75 đều đúng. Với số thập phân vô hạn như 2/3, hệ thống chấp nhận cả làm tròn và cắt 3 chữ số (.666 và .667).",
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
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    document.documentElement.lang = COPY[locale].htmlLang;
  }, [locale]);

  const t = COPY[locale];
  const isVi = locale === "vi";

  return (
    <div className="min-h-dvh bg-bg text-body selection:bg-primary-soft selection:text-primary">
      {/* -------------------------------------------------------------
          HEADER / NAVBAR (Ảnh 4)
          ------------------------------------------------------------- */}
      <header className="sticky top-0 z-50 border-b border-line/70 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between gap-4 px-5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-display text-xl font-black tracking-tight text-primary">
              AtlasSAT
            </span>
          </Link>

          {/* Navigation links */}
          <nav className="hidden items-center gap-6 text-sm font-semibold text-body md:flex">
            <a href="#about" className="transition-colors hover:text-primary">
              {isVi ? "Về chúng tôi" : "About us"}
            </a>
            <a href="#audience" className="transition-colors hover:text-primary">
              {isVi ? "Dành cho ai" : "Who it is for"}
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
          <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-[680px] -translate-x-1/2 rounded-full bg-primary-soft blur-3xl" />

          <div className="mx-auto max-w-[980px] px-5 text-center">
            {/* Title */}
            <Reveal direction="up">
              <h1 className="font-display text-4xl font-black tracking-tight text-ink sm:text-5xl md:text-6xl md:leading-[1.15]">
                {isVi ? "Luyện thi Digital SAT có hệ thống," : "Digital SAT prep, done properly,"}
                <br />
                <span className="text-primary">
                  {isVi ? "cùng Atlas Plus Consulting" : "with Atlas Plus Consulting"}
                </span>
              </h1>
            </Reveal>

            {/* Subtitle */}
            <Reveal direction="up" delay={150}>
              <p className="mx-auto mt-6 max-w-[680px] text-base leading-relaxed text-body md:text-lg">
                {isVi
                  ? "Lộ trình cá nhân hoá theo trình độ và mục tiêu của từng học viên, tập trung vào nền tảng học thuật, tư duy phân tích và chiến lược làm bài dưới áp lực thời gian."
                  : "A personalised roadmap built around each learner, focused on academic foundations, analytical thinking and strategy under time pressure."}
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
                    <span>{isVi ? "Bắt đầu hành trình SAT cùng với Atlas" : "Start your SAT journey with Atlas"}</span>
                  </button>
                </Link>

              </div>
            </Reveal>

            {/* -------------------------------------------------------------
                FLOATING 3D DASHBOARD PREVIEW (Ảnh 4)
                ------------------------------------------------------------- */}
            <Reveal direction="up" delay={350}>
              <div className="relative mx-auto mt-14 max-w-[940px] px-2">
                <div className="rounded-3xl border border-line/80 bg-surface p-4 shadow-soft-lg ring-8 ring-primary-soft transition-all hover:shadow-soft-lg md:p-6">
                  {/* Grid bên trong Mockup */}
                  <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
                    {/* Card 1: Daily Task */}
                    <div className="rounded-2xl border border-line bg-sunken/40 p-4 transition-transform hover:-translate-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink uppercase">Nhiệm vụ hôm nay</span>
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary">
                          2/3 hoàn thành
                        </span>
                      </div>
                      <ul className="mt-3 space-y-2 text-xs">
                        <li className="flex items-center gap-2 text-ink">
                          <span className="line-through text-muted">Math: Phương trình bậc hai</span>
                        </li>
                        <li className="flex items-center gap-2 text-ink">
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
                      </div>
                      <div className="mt-3 space-y-2">
                        <div>
                          <div className="flex justify-between text-[11px] font-bold">
                            <span>Algebra & Functions</span>
                            <span className="text-success">92%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-sunken">
                            <div className="h-full w-[92%] rounded-full bg-success" />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] font-bold">
                            <span>Boundaries & Transitions</span>
                            <span className="text-info">68%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-sunken">
                            <div className="h-full w-[68%] rounded-full bg-info" />
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* -------------------------------------------------------------
            VỀ CHÚNG TÔI
            ------------------------------------------------------------- */}
        <section id="about" className="border-t border-line/60 bg-surface py-16 md:py-24">
          <div className="mx-auto max-w-[780px] px-5">
            <Reveal direction="up">
              <h2 className="font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">
                {isVi ? "Về chúng tôi" : "About us"}
              </h2>
            </Reveal>

            <Reveal direction="up" delay={100}>
              <div className="mt-6 space-y-5 text-base leading-relaxed text-body">
                <p>
                  Atlas Plus Consulting là đơn vị đào tạo SAT được xây dựng bởi những người đã trực
                  tiếp trải qua quá trình luyện thi và ứng tuyển vào các trường đại học Mỹ. Chúng
                  mình hiểu rằng SAT không chỉ là một kỳ thi chuẩn hóa, mà là một bước chiến lược
                  trong toàn bộ hồ sơ du học.
                </p>
                <p>
                  Tại Atlas, SAT được tiếp cận bằng tư duy hệ thống. Chúng mình không dạy theo kiểu
                  luyện đề đơn thuần, mà tập trung vào nền tảng học thuật, khả năng tư duy phân tích
                  và chiến lược làm bài dưới áp lực thời gian. Mỗi học viên đều có lộ trình cá nhân
                  hóa dựa trên trình độ hiện tại, mục tiêu và kế hoạch dài hạn.
                </p>
                <p>
                  Đội ngũ giảng viên của Atlas có kinh nghiệm luyện thi thực tế và hiểu rõ cấu trúc
                  đề, cách ra bẫy cũng như phương pháp tối ưu điểm số. Quan trọng hơn, chúng mình
                  đồng hành sát sao để học viên không chỉ cải thiện kết quả, mà còn xây dựng sự tự
                  tin và năng lực học thuật bền vững.
                </p>
                <p className="font-semibold text-ink">
                  Atlas không chỉ giúp bạn tăng điểm. Chúng mình giúp bạn hiểu bản chất bài thi và
                  làm chủ kỳ thi một cách chiến lược.
                </p>
              </div>
            </Reveal>
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
                  Câu hỏi thường gặp
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
                        <span
                          aria-hidden
                          className={
                            isOpen
                              ? "shrink-0 text-lg font-black leading-none text-primary"
                              : "shrink-0 text-lg font-black leading-none text-muted"
                          }
                        >
                          {isOpen ? "\u2212" : "+"}
                        </span>
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
        <section className="relative overflow-hidden bg-primary py-20 text-center text-white">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/15 via-transparent to-transparent opacity-60" />

          <Reveal direction="up">
            <div className="mx-auto max-w-[680px] px-5">
              <h2 className="font-display mt-4 text-3xl font-black tracking-tight sm:text-5xl">
                {t.closing.title}
              </h2>
              <p className="mt-3 text-sm text-white/85 md:text-base">{t.closing.body}</p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/login">
                  <button
                    type="button"
                    className="rounded-full bg-white px-8 py-3.5 text-sm font-black text-primary shadow-xl transition-all hover:scale-105 active:scale-95"
                  >
                    {t.closing.cta}
                  </button>
                </Link>
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
