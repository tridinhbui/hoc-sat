/**
 * Hằng số và kiểu dùng chung cho điểm danh.
 *
 * Tách khỏi `repo/attendance.ts` vì file đó có `server-only`: client
 * component nào import giá trị từ đó sẽ làm hỏng build. Ở đây không có
 * gì chạm tới DB nên cả hai phía đều dùng được.
 */

export const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Có mặt",
  absent: "Vắng",
  late: "Đi trễ",
  excused: "Có phép",
};

export type SessionSummary = {
  id: string;
  sessionDate: string;
  title: string | null;
  present: number;
  absent: number;
  late: number;
  excused: number;
  marked: number;
};

export type RosterRow = {
  studentId: string;
  name: string;
  email: string;
  status: AttendanceStatus | null;
  note: string | null;
};

export type StudentAttendance = {
  studentId: string;
  name: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  /** Tỉ lệ có mặt (có mặt + đi trễ) trên số buổi không tính nghỉ phép */
  rate: number | null;
};
