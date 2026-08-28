import type { StudentReport } from "./types";
import { overallScore, pct, FLAG_LABEL, flagOf } from "./types";

/**
 * Sinh CSV để gửi phụ huynh / nộp cho trung tâm.
 *
 * BOM ở đầu file: Excel trên Windows đọc CSV không BOM theo bảng mã hệ
 * thống, và tên tiếng Việt sẽ ra một mớ ký tự lạ. Đây là lý do duy nhất
 * ba byte đó tồn tại ở đây.
 */
const BOM = "\uFEFF";

const HEADERS = [
  "Họ tên",
  "Email",
  "Tổng kết (%)",
  "Trạng thái",
  "Bài tập (%)",
  "Đã chấm",
  "Đã giao",
  "Đã nộp",
  "Nộp trễ",
  "Thi (%)",
  "Số bài thi",
  "Chuyên cần (%)",
  "Số buổi",
] as const;

function cell(value: string | number | null): string {
  if (value === null) return "";
  const s = String(value);
  // Dấu phẩy, nháy kép, xuống dòng đều phải bọc lại; tên tiếng Việt hay có
  // dấu phẩy khi ai đó nhập "Nguyễn Văn A, lớp 12".
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function reportToCsv(rows: StudentReport[]): string {
  const lines = [HEADERS.map(cell).join(",")];

  for (const r of rows) {
    lines.push(
      [
        r.name,
        r.email,
        overallScore(r),
        FLAG_LABEL[flagOf(r)],
        pct(r.assignmentScore, r.assignmentMax),
        r.assignmentsGraded,
        r.assignmentsAssigned,
        r.assignmentsTurnedIn,
        r.assignmentsLate,
        pct(r.examScore, r.examMax),
        r.examsTaken,
        r.attendanceRate,
        r.sessionsCounted,
      ]
        .map(cell)
        .join(","),
    );
  }

  // CRLF: bản CSV mà Excel coi là "đúng chuẩn" nhất trên cả hai hệ điều hành.
  return BOM + lines.join("\r\n") + "\r\n";
}

/** Tên file gợi ý: `bao-cao_SAT-Math_2026-08-28.csv` */
export function reportFileName(className: string, today: string): string {
  const slug =
    className
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "lop";
  return `bao-cao_${slug}_${today}.csv`;
}
