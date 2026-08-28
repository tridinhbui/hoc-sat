import { TZ } from "@/lib/utils/date";

/**
 * Dựng lưới tháng theo GIỜ VIỆT NAM, tuần bắt đầu từ thứ Hai.
 *
 * Mọi tính toán đi qua chuỗi "YYYY-MM-DD" chứ không qua Date của máy chủ:
 * Worker chạy UTC, nếu lấy `getDate()` thì buổi tối ở VN sẽ rơi sang hôm sau.
 */

export type DayCell = {
  dateKey: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
};

const fmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const todayKey = () => fmt.format(new Date());

/** "2026-08" → nhãn "Tháng 8, 2026" */
export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `Tháng ${m}, ${y}`;
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export const currentMonth = () => todayKey().slice(0, 7);

const key = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Thứ trong tuần với thứ Hai = 0. */
function weekdayMondayFirst(y: number, m: number, d: number) {
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function buildMonthGrid(month: string): DayCell[] {
  const [y, m] = month.split("-").map(Number);
  const today = todayKey();

  const lead = weekdayMondayFirst(y, m, 1);
  const total = daysInMonth(y, m);

  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const prevTotal = daysInMonth(prevY, prevM);

  const cells: DayCell[] = [];

  for (let i = lead - 1; i >= 0; i--) {
    const d = prevTotal - i;
    cells.push({
      dateKey: key(prevY, prevM, d),
      day: d,
      inMonth: false,
      isToday: false,
    });
  }

  for (let d = 1; d <= total; d++) {
    const dk = key(y, m, d);
    cells.push({ dateKey: dk, day: d, inMonth: true, isToday: dk === today });
  }

  // Điền cho đủ hàng cuối để lưới không bị khuyết ô.
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  let d = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ dateKey: key(nextY, nextM, d), day: d, inMonth: false, isToday: false });
    d++;
  }

  return cells;
}

/** Khoảng thời gian cần truy vấn cho lưới tháng — phủ cả ngày tràn đầu/cuối. */
export function monthRange(month: string): { from: Date; to: Date } {
  const cells = buildMonthGrid(month);
  return {
    from: new Date(`${cells[0].dateKey}T00:00:00+07:00`),
    to: new Date(`${cells[cells.length - 1].dateKey}T23:59:59+07:00`),
  };
}
