/** Toàn hệ thống lưu unix-ms UTC, hiển thị theo giờ VN. */
export const TZ = "Asia/Ho_Chi_Minh";

const dt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, ...opts });

export const fmtDate = (d: Date | number) => dt({ dateStyle: "medium" }).format(d);
export const fmtDateTime = (d: Date | number) =>
  dt({ dateStyle: "medium", timeStyle: "short" }).format(d);
export const fmtTime = (d: Date | number) => dt({ timeStyle: "short" }).format(d);

/** YYYY-MM-DD theo giờ VN — dùng cho attendance_sessions.session_date */
export function vnDateKey(d: Date | number = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return parts; // en-CA cho ra đúng dạng YYYY-MM-DD
}

/** "còn 3 giờ", "trễ 2 ngày" — microcopy hạn nộp */
export function relativeDue(due: Date | number, from: Date | number = Date.now()): string {
  const diff = new Date(due).getTime() - new Date(from).getTime();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "ngay bây giờ";
}
