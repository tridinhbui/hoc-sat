/**
 * Kiểu và hàm thuần cho báo cáo tiến độ — dùng chung server lẫn client.
 *
 * Tách khỏi `repo/reports.ts` vì file đó có `server-only`; bảng báo cáo
 * là client component (sắp xếp theo cột) nên cần các hàm định dạng ở đây.
 */

export type StudentReport = {
  studentId: string;
  name: string;
  email: string;

  /** Bài tập đã được TRẢ (returned) — chỉ điểm đã chốt mới vào báo cáo. */
  assignmentsGraded: number;
  /** Bài đã publish tính tới hiện tại — mẫu số của "đã nộp bao nhiêu". */
  assignmentsAssigned: number;
  assignmentsTurnedIn: number;
  assignmentsLate: number;
  /** Tổng điểm đạt / tổng điểm tối đa của các bài đã trả. */
  assignmentScore: number | null;
  assignmentMax: number | null;

  examsTaken: number;
  examScore: number | null;
  examMax: number | null;

  attendanceRate: number | null;
  sessionsCounted: number;
};

/** Phần trăm làm tròn, hoặc null khi mẫu số bằng 0. */
export function pct(score: number | null, max: number | null): number | null {
  if (score === null || max === null || max <= 0) return null;
  return Math.round((score / max) * 100);
}

/**
 * Một con số duy nhất để xếp hạng cả lớp: bài tập 40%, thi 40%, chuyên cần 20%.
 *
 * Trọng số của phần thiếu dữ liệu được chia lại cho các phần còn lại, nếu
 * không thì học sinh của lớp chưa thi lần nào sẽ bị kéo xuống một cách vô lý.
 * Chưa có dữ liệu nào thì trả null chứ không trả 0 — "chưa học gì" và "học
 * mà điểm 0" là hai chuyện khác nhau.
 */
export function overallScore(r: StudentReport): number | null {
  const parts: { value: number; weight: number }[] = [];

  const a = pct(r.assignmentScore, r.assignmentMax);
  if (a !== null) parts.push({ value: a, weight: 0.4 });

  const e = pct(r.examScore, r.examMax);
  if (e !== null) parts.push({ value: e, weight: 0.4 });

  if (r.attendanceRate !== null) parts.push({ value: r.attendanceRate, weight: 0.2 });

  if (parts.length === 0) return null;

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  return Math.round(parts.reduce((s, p) => s + p.value * p.weight, 0) / totalWeight);
}

/** Ngưỡng cảnh báo để giáo viên quét mắt qua bảng là thấy em nào cần gọi phụ huynh. */
export type Flag = "ok" | "watch" | "risk";

export function flagOf(r: StudentReport): Flag {
  const overall = overallScore(r);
  const missing = r.assignmentsAssigned - r.assignmentsTurnedIn;

  // Chuyên cần dưới 75% là vấn đề riêng, kể cả khi điểm vẫn đẹp: em đó đang
  // học bù ở đâu đó, và điều đó không kéo dài được.
  if (r.attendanceRate !== null && r.attendanceRate < 75) return "risk";
  if (overall !== null && overall < 50) return "risk";
  if (missing >= 3) return "risk";

  if (r.attendanceRate !== null && r.attendanceRate < 90) return "watch";
  if (overall !== null && overall < 70) return "watch";
  if (missing >= 1) return "watch";

  return "ok";
}

export const FLAG_LABEL: Record<Flag, string> = {
  ok: "Ổn",
  watch: "Theo dõi",
  risk: "Cần can thiệp",
};
