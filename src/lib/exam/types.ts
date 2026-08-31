/** Kiểu và preset dùng chung cho phần thi — client component import được. */

export const EXAM_KINDS = ["midterm", "final", "practice"] as const;
export type ExamKind = (typeof EXAM_KINDS)[number];

export const EXAM_KIND_LABEL: Record<ExamKind, string> = {
  midterm: "Giữa kỳ",
  final: "Cuối kỳ",
  practice: "Luyện tập",
};

/**
 * Preset theo định dạng SAT hiện hành. Đây là con số trung tâm yêu cầu,
 * để sẵn thành preset cho giáo viên khỏi gõ tay mỗi lần.
 */
export const MODULE_PRESETS = {
  math: { durationMinutes: 35, questionCount: 22, name: "Math" },
  rw: { durationMinutes: 32, questionCount: 27, name: "Reading and Writing" },
} as const;

export const PROCTOR_EVENT_TYPES = [
  "blur",
  "visibility_hidden",
  "fullscreen_exit",
  "copy",
  "paste",
  "contextmenu",
  "devtools",
  "resize",
  "disconnect",
  "multi_tab",
] as const;
export type ProctorEventType = (typeof PROCTOR_EVENT_TYPES)[number];

export const PROCTOR_LABEL: Record<ProctorEventType, string> = {
  blur: "Rời khỏi cửa sổ",
  visibility_hidden: "Chuyển tab",
  fullscreen_exit: "Thoát toàn màn hình",
  copy: "Thử copy",
  paste: "Thử paste",
  contextmenu: "Chuột phải",
  devtools: "Mở DevTools",
  resize: "Đổi kích thước cửa sổ",
  disconnect: "Mất kết nối",
  multi_tab: "Mở đề ở tab khác",
};

/**
 * Chỉ những hành vi này mới cộng vào violation_count và có thể dẫn tới
 * nộp bài ép buộc. Copy/chuột phải chỉ ghi log — chặn là đủ, không nên
 * đuổi học sinh khỏi phòng thi vì bấm nhầm Ctrl+C.
 */
export const HARD_VIOLATIONS: ProctorEventType[] = [
  "fullscreen_exit",
  "visibility_hidden",
  "multi_tab",
];

export const ATTEMPT_STATUSES = [
  "not_started",
  "in_progress",
  "submitted",
  "auto_submitted",
  "voided",
] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export const ATTEMPT_LABEL: Record<AttemptStatus, string> = {
  not_started: "Chưa vào thi",
  in_progress: "Đang làm bài",
  submitted: "Đã nộp",
  auto_submitted: "Hết giờ, tự nộp",
  voided: "Đã huỷ",
};
