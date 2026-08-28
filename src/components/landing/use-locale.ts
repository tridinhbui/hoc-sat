"use client";

import { useCallback, useSyncExternalStore } from "react";
import { LOCALES, type Locale } from "@/lib/landing/content";

const STORAGE_KEY = "hocsat.locale";

/* ------------------------------------------------------------------ *
 * localStorage là store nằm ngoài React, nên đọc nó bằng
 * `useSyncExternalStore` chứ không phải `useState` + `useEffect`.
 *
 * Quan trọng: `getServerSnapshot` trả "vi" khớp với `lang="vi"` ở root
 * layout, nên HTML dựng ở server luôn ổn định; React tự render lại bằng
 * giá trị thật của client sau khi hydrate, không sinh cảnh báo lệch.
 * ------------------------------------------------------------------ */

const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  // Mở hai tab thì đổi bên này bên kia đổi theo.
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

function getSnapshot(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isLocale(saved) ? saved : "vi";
  } catch {
    // Chế độ riêng tư chặn storage — không phải lỗi, cứ dùng mặc định.
    return "vi";
  }
}

const getServerSnapshot = (): Locale => "vi";

export function useLocale(): [Locale, (next: Locale) => void] {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLocale = useCallback((next: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Không lưu được thì lựa chọn chỉ sống trong phiên này.
    }
    // `storage` không bắn trong chính tab đã ghi, phải tự báo.
    for (const fn of listeners) fn();
  }, []);

  return [locale, setLocale];
}
