/**
 * Kiểu dùng chung cho calendar — client component import được
 * (repo có `server-only`).
 */

export const EVENT_TYPES = ["class", "deadline", "midterm", "final", "other"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_LABEL: Record<EventType, string> = {
  class: "Buổi học",
  deadline: "Hạn nộp",
  midterm: "Thi giữa kỳ",
  final: "Thi cuối kỳ",
  other: "Khác",
};

/** Nguồn của một mục trên lịch — quyết định có sửa được hay không. */
export type FeedSource = "event" | "assignment" | "exam";

export type FeedItem = {
  id: string;
  source: FeedSource;
  type: EventType;
  title: string;
  /** unix ms UTC */
  startAt: number;
  endAt: number | null;
  allDay: boolean;
  classId: string;
  className: string;
  subject: "rw" | "math";
  /** "YYYY-MM-DD" theo giờ VN — khoá để xếp vào ô ngày */
  dateKey: string;
  /** Link tới nơi xử lý (bài tập, đề thi). Mục tự tạo thì không có. */
  href: string | null;
};
