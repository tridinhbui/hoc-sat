"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarCheck,
  ClipboardList,
  FileText,
  ListChecks,
  ShieldCheck,
} from "lucide-react";

import { COPY } from "@/lib/landing/content";
import { Cu } from "@/components/mascot/cu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageToggle } from "./language-toggle";
import { useLocale } from "./use-locale";

const ICON = {
  assignment: ClipboardList,
  quiz: ListChecks,
  analytics: BarChart3,
  attendance: CalendarCheck,
  materials: FileText,
  exam: ShieldCheck,
} as const;

export function Landing() {
  const [locale, setLocale] = useLocale();

  // `lang` sai thì trình đọc màn hình phát âm tiếng Anh bằng giọng Việt.
  useEffect(() => {
    document.documentElement.lang = COPY[locale].htmlLang;
  }, [locale]);

  const t = COPY[locale];

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="bg-surface text-primary sr-only rounded-full px-4 py-2 font-semibold focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50"
      >
        {locale === "vi" ? "Tới nội dung chính" : "Skip to content"}
      </a>

      <header className="mx-auto flex w-full max-w-[1080px] items-center justify-between gap-4 px-5 py-5">
        <div className="flex items-center gap-2">
          <Cu pose="wave" size={40} />
          <span className="font-display text-ink text-lg font-extrabold">HocSAT</span>
        </div>

        <nav className="flex items-center gap-2">
          <a
            href="#features"
            className="text-body hover:text-primary hidden rounded-full px-3 py-2 text-sm font-semibold sm:block"
          >
            {t.nav.features}
          </a>
          <a
            href="#audience"
            className="text-body hover:text-primary hidden rounded-full px-3 py-2 text-sm font-semibold sm:block"
          >
            {t.nav.forWho}
          </a>
          <LanguageToggle value={locale} onChange={setLocale} label={t.langSwitchLabel} />
          <Link href="/login">
            <Button size="sm">{t.nav.login}</Button>
          </Link>
        </nav>
      </header>

      <main id="main">
        {/* ------------------------------ Hero ------------------------------ */}
        <section className="mx-auto grid w-full max-w-[1080px] items-center gap-10 px-5 pt-8 pb-16 md:grid-cols-[1.15fr_.85fr] md:pt-16">
          <div className="fade-up">
            <Badge tone="brand">{t.hero.eyebrow}</Badge>
            <h1 className="font-display text-ink mt-4 text-[34px] leading-[1.15] font-extrabold sm:text-[44px]">
              {t.hero.title}{" "}
              {/* Xuống dòng ở đúng dấu phẩy. Để chảy tự nhiên thì ở khổ
                  desktop câu ngắt thành "…gọn gàng, chấm / bài tự động." */}
              <span className="text-primary sm:block">{t.hero.titleAccent}</span>
            </h1>
            <p className="text-body mt-4 max-w-[52ch] text-base sm:text-[17px]">{t.hero.body}</p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/login">
                <Button size="lg">{t.hero.ctaPrimary}</Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="secondary">
                  {t.hero.ctaSecondary}
                </Button>
              </a>
            </div>

            {/* Không có tự đăng ký — nói thẳng, đỡ một vòng thất vọng. */}
            <p className="text-muted mt-4 text-sm">{t.hero.note}</p>
          </div>

          <div className="flex justify-center md:justify-end">
            <div className="bg-primary-soft rounded-[var(--radius-xl)] p-8">
              <Cu pose="graduate" size={200} />
            </div>
          </div>
        </section>

        {/* ---------------------------- Tính năng ---------------------------- */}
        <section id="features" className="mx-auto w-full max-w-[1080px] scroll-mt-8 px-5 py-14">
          <h2 className="font-display text-ink text-[26px] font-extrabold sm:text-[30px]">
            {t.featuresHeading}
          </h2>
          <p className="text-muted mt-2">{t.featuresSub}</p>

          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {t.features.map((f) => {
              const Icon = ICON[f.icon];
              return (
                <li key={f.key}>
                  <Card className="rise h-full">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <span className="bg-primary-soft text-primary grid size-11 place-items-center rounded-[var(--radius-md)]">
                        <Icon size={20} aria-hidden />
                      </span>
                      {f.soon && <Badge tone="accent">{t.soonLabel}</Badge>}
                    </div>
                    <h3 className="text-[17px]">{f.title}</h3>
                    <p className="text-body mt-2 text-sm">{f.body}</p>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---------------------------- Dành cho ai ---------------------------- */}
        <section id="audience" className="mx-auto w-full max-w-[1080px] scroll-mt-8 px-5 py-14">
          <h2 className="font-display text-ink text-[26px] font-extrabold sm:text-[30px]">
            {t.audienceHeading}
          </h2>

          <ul className="mt-8 grid gap-5 sm:grid-cols-3">
            {t.audiences.map((a) => (
              <li key={a.key}>
                <Card className="h-full">
                  <h3 className="text-[17px]">{a.title}</h3>
                  <p className="text-body mt-2 text-sm">{a.body}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------ Kết ------------------------------ */}
        <section className="mx-auto w-full max-w-[1080px] px-5 pt-6 pb-20">
          <Card className="flex flex-col items-center gap-5 py-12 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-4">
              <Cu pose="wave" size={72} />
              <div>
                <h2 className="font-display text-ink text-[22px] font-extrabold">
                  {t.closing.title}
                </h2>
                <p className="text-muted mt-1 text-sm">{t.closing.body}</p>
              </div>
            </div>
            <Link href="/login">
              <Button size="lg">{t.closing.cta}</Button>
            </Link>
          </Card>
        </section>
      </main>

      <footer className="border-line border-t">
        <div className="text-muted mx-auto flex w-full max-w-[1080px] flex-col gap-1 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display text-ink font-bold">HocSAT</span>
          <span>{t.footer}</span>
        </div>
      </footer>
    </div>
  );
}
