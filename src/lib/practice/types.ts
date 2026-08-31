/**
 * Kiểu dùng chung cho luyện tập cá nhân hoá.
 *
 * Tách khỏi `repo/practice.ts` vì file đó có `server-only`, còn màn hình
 * luyện tập là client component.
 */

export type WeakDomain = {
  domain: string;
  answered: number;
  correct: number;
  wrong: number;
  /** Tỉ lệ đúng, null khi chưa có câu nào được chấm */
  rate: number | null;
};

export type PracticeQuestion = {
  id: string;
  prompt: string;
  imageR2Key: string | null;
  /** Tự luận không tự luyện được, nên chỉ có hai loại này */
  type: "mcq" | "grid_in";
  choices: { key: string; text: string }[] | null;
  domain: string | null;
  skillTag: string | null;
  /** Đã gặp câu này trong bài tập trước đây */
  seenBefore: boolean;
  /** Trong số đó, đã từng trả lời sai */
  wrongBefore: boolean;
};

/** Nhãn mức độ để học sinh biết nên ôn mảng nào trước. */
export function urgencyOf(d: WeakDomain): "cao" | "vừa" | "thấp" {
  if (d.rate === null) return "vừa";
  if (d.rate < 50) return "cao";
  if (d.rate < 75) return "vừa";
  return "thấp";
}
