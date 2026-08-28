/* ------------------------------------------------------------------ *
 * Chuẩn hoá và so khớp đáp án.
 *
 * Đây là chỗ dễ chấm sai nhất của cả hệ thống. SAT chấp nhận cùng một
 * đáp số viết theo nhiều kiểu: 3/4, .75, 0.75 đều đúng. Với số thập phân
 * vô hạn tuần hoàn (2/3), College Board yêu cầu điền KÍN ô — tức là ít
 * nhất 3 chữ số sau dấu phẩy, làm tròn hoặc cắt đều được: .666 và .667
 * cùng đúng, nhưng .67 thì sai.
 *
 * Không so chuỗi thuần ở bất cứ đâu.
 * ------------------------------------------------------------------ */

/** Số chữ số thập phân tối thiểu khi đáp án không biểu diễn hữu hạn được. */
const REQUIRED_DECIMALS = 3;
const EPSILON = 1e-9;

export type ParsedAnswer =
  | { ok: true; value: number; decimals: number; isFraction: boolean }
  | { ok: false; reason: "empty" | "invalid" };

/**
 * Đọc một ô grid-in thành số.
 * Chấp nhận: "3/4", "-3/4", ".75", "0.75", "12".
 * Từ chối: chữ cái, %, $, hỗn số ("3 1/2"), phân số mẫu 0.
 */
export function parseGridIn(raw: string): ParsedAnswer {
  const s = raw.trim();
  if (!s) return { ok: false, reason: "empty" };

  // CHỈ cắt khoảng trắng hai đầu. Xoá cả khoảng trắng bên trong sẽ biến
  // hỗn số "3 1/2" thành "31/2" = 15.5 — SAT không chấp nhận hỗn số,
  // phải để nó rơi vào nhánh không hợp lệ.
  // Dấu phẩy ngăn cách nghìn, %, $ cũng không hợp lệ trong ô SAT.
  if (/[^0-9./-]/.test(s)) return { ok: false, reason: "invalid" };

  const frac = s.match(/^(-?\d+)\/(\d+)$/);
  if (frac) {
    const den = Number(frac[2]);
    if (den === 0) return { ok: false, reason: "invalid" };
    return { ok: true, value: Number(frac[1]) / den, decimals: Infinity, isFraction: true };
  }

  const dec = s.match(/^(-?)(\d*)(?:\.(\d+))?$/);
  if (!dec || (!dec[2] && !dec[3])) return { ok: false, reason: "invalid" };

  const value = Number(s);
  if (!Number.isFinite(value)) return { ok: false, reason: "invalid" };

  return { ok: true, value, decimals: dec[3]?.length ?? 0, isFraction: false };
}

/** Cắt (không làm tròn) về `d` chữ số thập phân. */
function truncateTo(value: number, d: number): number {
  const f = 10 ** d;
  return Math.trunc(value * f + (value < 0 ? -EPSILON : EPSILON)) / f;
}

function roundTo(value: number, d: number): number {
  const f = 10 ** d;
  return Math.round(value * f) / f;
}

const near = (a: number, b: number) => Math.abs(a - b) < EPSILON;

/** Đáp án có biểu diễn hữu hạn trong `d` chữ số thập phân không. */
function isExactAt(value: number, d: number): boolean {
  return near(value, roundTo(value, d));
}

/**
 * So một câu trả lời với MỘT đáp án đúng.
 *
 * - Bằng đúng giá trị → đúng (bao gồm mọi cách viết phân số/thập phân).
 * - Đáp án là số vô hạn tuần hoàn → học sinh phải điền ≥3 chữ số thập phân,
 *   cắt hay làm tròn đều chấp nhận.
 */
export function matchesOne(studentRaw: string, correctRaw: string): boolean {
  const student = parseGridIn(studentRaw);
  const correct = parseGridIn(correctRaw);
  if (!student.ok || !correct.ok) return false;

  if (near(student.value, correct.value)) return true;

  // Phân số thì đã so bằng giá trị ở trên; chỉ số thập phân mới xét cắt/làm tròn.
  if (student.isFraction) return false;

  const d = student.decimals;
  // Đáp án viết hữu hạn được trong ít chữ số hơn thì học sinh phải ghi đúng,
  // không được viết xấp xỉ.
  if (isExactAt(correct.value, d)) return false;
  if (d < REQUIRED_DECIMALS) return false;

  return near(student.value, truncateTo(correct.value, d)) ||
    near(student.value, roundTo(correct.value, d));
}

/** So với đáp án chính và toàn bộ biến thể giáo viên khai báo thêm. */
export function matchesGridIn(
  studentRaw: string,
  correct: string | null,
  accepted: string[] | null,
): boolean {
  const candidates = [correct, ...(accepted ?? [])].filter(
    (x): x is string => typeof x === "string" && x.trim() !== "",
  );
  return candidates.some((c) => matchesOne(studentRaw, c));
}

/** Trắc nghiệm: so nhãn lựa chọn, bỏ qua hoa thường và khoảng trắng. */
export function matchesMcq(studentRaw: string, correct: string | null): boolean {
  if (!correct) return false;
  return studentRaw.trim().toUpperCase() === correct.trim().toUpperCase();
}

export type QuestionForGrading = {
  type: "mcq" | "grid_in" | "free_text";
  correctAnswer: string | null;
  acceptedAnswers: string[] | null;
  points: number;
};

/**
 * Chấm một câu. `free_text` trả về null — giáo viên phải chấm tay,
 * không đoán bừa là đúng hay sai.
 */
export function gradeAnswer(
  q: QuestionForGrading,
  response: string | null,
): { isCorrect: boolean | null; pointsAwarded: number | null } {
  if (q.type === "free_text") return { isCorrect: null, pointsAwarded: null };

  const raw = (response ?? "").trim();
  if (!raw) return { isCorrect: false, pointsAwarded: 0 };

  const ok =
    q.type === "mcq"
      ? matchesMcq(raw, q.correctAnswer)
      : matchesGridIn(raw, q.correctAnswer, q.acceptedAnswers);

  return { isCorrect: ok, pointsAwarded: ok ? q.points : 0 };
}
