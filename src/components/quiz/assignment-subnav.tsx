"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export function AssignmentSubnav({ base }: { base: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: base, label: "Bài nộp" },
    { href: `${base}/questions`, label: "Soạn đề" },
    { href: `${base}/analytics`, label: "Thống kê" },
  ];

  return (
    <nav className="flex gap-1 overflow-x-auto">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              active ? "bg-primary text-white" : "bg-sunken text-body hover:bg-primary-soft",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
