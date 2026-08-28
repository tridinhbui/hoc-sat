import { describe, expect, it } from "vitest";
import {
  gradeAnswer,
  matchesGridIn,
  matchesMcq,
  matchesOne,
  parseGridIn,
} from "@/lib/grading/normalize";

/* Chỗ dễ chấm sai nhất — test dày hơn mọi phần khác. */

describe("parseGridIn", () => {
  it("đọc được phân số và thập phân", () => {
    expect(parseGridIn("3/4")).toMatchObject({ ok: true, value: 0.75, isFraction: true });
    expect(parseGridIn(".75")).toMatchObject({ ok: true, value: 0.75, decimals: 2 });
    expect(parseGridIn("0.75")).toMatchObject({ ok: true, value: 0.75, decimals: 2 });
    expect(parseGridIn("12")).toMatchObject({ ok: true, value: 12, decimals: 0 });
    expect(parseGridIn("-3/4")).toMatchObject({ ok: true, value: -0.75 });
    expect(parseGridIn(" 0.5 ")).toMatchObject({ ok: true, value: 0.5 });
  });

  it("từ chối thứ không phải số hợp lệ của ô SAT", () => {
    for (const bad of ["", "abc", "50%", "$3", "1,000", "3 1/2", "3/0", "."]) {
      expect(parseGridIn(bad).ok, bad).toBe(false);
    }
  });
});

describe("matchesOne — cùng một số viết nhiều kiểu", () => {
  it("3/4 · .75 · 0.75 là một", () => {
    for (const s of ["3/4", ".75", "0.75", "6/8"]) {
      expect(matchesOne(s, "3/4"), s).toBe(true);
    }
  });

  it("số nguyên và số âm", () => {
    expect(matchesOne("12", "12")).toBe(true);
    expect(matchesOne("12.0", "12")).toBe(true);
    expect(matchesOne("-3/4", "-.75")).toBe(true);
    expect(matchesOne("13", "12")).toBe(false);
  });
});

describe("matchesOne — số thập phân vô hạn tuần hoàn", () => {
  it("2/3: phải điền kín ô, cắt hay làm tròn đều được", () => {
    expect(matchesOne(".666", "2/3")).toBe(true); // cắt
    expect(matchesOne(".667", "2/3")).toBe(true); // làm tròn
    expect(matchesOne("0.6667", "2/3")).toBe(true);
    expect(matchesOne("2/3", "2/3")).toBe(true);
  });

  it("2/3: điền thiếu chữ số thì SAI", () => {
    expect(matchesOne(".67", "2/3")).toBe(false);
    expect(matchesOne(".7", "2/3")).toBe(false);
    expect(matchesOne("0.66", "2/3")).toBe(false);
  });

  it("1/3 và 1/7", () => {
    expect(matchesOne(".333", "1/3")).toBe(true);
    expect(matchesOne(".33", "1/3")).toBe(false);
    expect(matchesOne(".142", "1/7")).toBe(true);
    expect(matchesOne(".143", "1/7")).toBe(true);
    expect(matchesOne(".14", "1/7")).toBe(false);
  });

  it("đáp án viết hữu hạn được thì không nhận xấp xỉ", () => {
    // 0.5 ghi đủ được trong 1 chữ số, nên .499 hay .501 đều sai.
    expect(matchesOne(".499", "1/2")).toBe(false);
    expect(matchesOne(".501", "0.5")).toBe(false);
    expect(matchesOne(".5", "1/2")).toBe(true);
  });
});

describe("matchesGridIn — biến thể giáo viên khai thêm", () => {
  it("nhận mọi biến thể được liệt kê", () => {
    expect(matchesGridIn("7/2", "3.5", ["7/2"])).toBe(true);
    expect(matchesGridIn("3.50", "3.5", null)).toBe(true);
    expect(matchesGridIn("3.6", "3.5", ["7/2"])).toBe(false);
  });
});

describe("matchesMcq", () => {
  it("bỏ qua hoa thường và khoảng trắng", () => {
    expect(matchesMcq("b", "B")).toBe(true);
    expect(matchesMcq(" B ", "B")).toBe(true);
    expect(matchesMcq("C", "B")).toBe(false);
  });
});

describe("gradeAnswer", () => {
  const mcq = { type: "mcq" as const, correctAnswer: "C", acceptedAnswers: null, points: 1 };
  const grid = { type: "grid_in" as const, correctAnswer: "2/3", acceptedAnswers: null, points: 2 };
  const free = { type: "free_text" as const, correctAnswer: null, acceptedAnswers: null, points: 5 };

  it("cho điểm khi đúng, 0 khi sai", () => {
    expect(gradeAnswer(mcq, "C")).toEqual({ isCorrect: true, pointsAwarded: 1 });
    expect(gradeAnswer(mcq, "A")).toEqual({ isCorrect: false, pointsAwarded: 0 });
    expect(gradeAnswer(grid, ".667")).toEqual({ isCorrect: true, pointsAwarded: 2 });
  });

  it("bỏ trống tính là sai, không phải là chưa chấm", () => {
    expect(gradeAnswer(mcq, "")).toEqual({ isCorrect: false, pointsAwarded: 0 });
    expect(gradeAnswer(mcq, null)).toEqual({ isCorrect: false, pointsAwarded: 0 });
  });

  it("tự luận KHÔNG tự chấm — để giáo viên chấm tay", () => {
    expect(gradeAnswer(free, "bất kỳ")).toEqual({ isCorrect: null, pointsAwarded: null });
  });
});
