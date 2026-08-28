import { describe, expect, it } from "vitest";
import { COPY, LOCALES, type LandingCopy } from "@/lib/landing/content";

/* ------------------------------------------------------------------ *
 * Từ điển song ngữ viết tay có đúng một kiểu hỏng: sửa một bên, quên
 * bên kia. Người Việt đọc trang tiếng Việt sẽ không bao giờ phát hiện
 * bản tiếng Anh thiếu một thẻ hay còn chuỗi rỗng. Bộ test này thay cho
 * việc phải tự đọc lại cả hai bản mỗi lần sửa chữ.
 * ------------------------------------------------------------------ */

/** Mọi chuỗi lá trong object, kèm đường dẫn để báo lỗi chỉ đúng chỗ. */
function leaves(value: unknown, path = ""): [string, unknown][] {
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [[path, value]];
}

const shape = (c: LandingCopy) =>
  leaves(c)
    .map(([p]) => p)
    .sort();

describe("Nội dung landing", () => {
  it("hai ngôn ngữ có cùng cấu trúc", () => {
    // So đường dẫn chứ không so giá trị: thiếu một feature, một audience,
    // hay một nhãn nút ở một bên là lộ ra ngay.
    expect(shape(COPY.en)).toEqual(shape(COPY.vi));
  });

  it("không có chuỗi rỗng hay chỗ chưa dịch", () => {
    for (const locale of LOCALES) {
      for (const [path, v] of leaves(COPY[locale])) {
        if (typeof v !== "string") continue;
        expect(v.trim(), `${locale}.${path} rỗng`).not.toBe("");
        expect(v, `${locale}.${path} còn chỗ chưa điền`).not.toMatch(/TODO|FIXME|XXX/i);
      }
    }
  });

  it("các mục tính năng khớp key và icon giữa hai bản", () => {
    expect(COPY.en.features.map((f) => f.key)).toEqual(COPY.vi.features.map((f) => f.key));
    expect(COPY.en.features.map((f) => f.icon)).toEqual(COPY.vi.features.map((f) => f.icon));
    expect(COPY.en.audiences.map((a) => a.key)).toEqual(COPY.vi.audiences.map((a) => a.key));
  });

  it("nhãn 'sắp có' đánh dấu đúng cùng những mục ở cả hai bản", () => {
    // Phòng thi lockdown là P6, chưa làm. Một bản gỡ nhãn còn bản kia giữ
    // thì thành ra hứa với người đọc tiếng Anh một thứ chưa tồn tại.
    const soon = (c: LandingCopy) => c.features.filter((f) => f.soon).map((f) => f.key);
    expect(soon(COPY.en)).toEqual(soon(COPY.vi));
    expect(soon(COPY.vi)).toEqual(["exam"]);
  });
});
