import { describe, expect, it } from "vitest";
import { buildMonthGrid, monthRange, shiftMonth } from "@/lib/calendar/month";

/* Lưới tháng tính bằng chuỗi ngày, không qua Date của máy chủ (Worker chạy UTC). */

describe("buildMonthGrid", () => {
  it("luôn đủ hàng 7 ngày và tuần bắt đầu từ thứ Hai", () => {
    for (const m of ["2026-01", "2026-02", "2026-08", "2026-12"]) {
      const cells = buildMonthGrid(m);
      expect(cells.length % 7).toBe(0);
    }
  });

  it("1/8/2026 là thứ Bảy → có 5 ô tràn từ tháng 7 ở đầu", () => {
    const cells = buildMonthGrid("2026-08");
    expect(cells.slice(0, 5).every((c) => !c.inMonth)).toBe(true);
    expect(cells[5]).toMatchObject({ dateKey: "2026-08-01", day: 1, inMonth: true });
  });

  it("tháng 2 năm nhuận có đủ 29 ngày", () => {
    const cells = buildMonthGrid("2028-02").filter((c) => c.inMonth);
    expect(cells).toHaveLength(29);
    expect(cells.at(-1)?.dateKey).toBe("2028-02-29");
  });

  it("bắc cầu qua năm", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-06", 7)).toBe("2027-01");
  });
});

describe("monthRange", () => {
  it("phủ trọn ô đầu và ô cuối của lưới theo giờ VN", () => {
    const { from, to } = monthRange("2026-08");
    const cells = buildMonthGrid("2026-08");
    // Ô đầu lưới là 27/7 (thứ Hai) lúc 00:00 giờ VN = 17:00 UTC hôm trước.
    expect(from.toISOString()).toBe(
      new Date(`${cells[0].dateKey}T00:00:00+07:00`).toISOString(),
    );
    expect(to.getTime()).toBeGreaterThan(from.getTime());
  });
});
