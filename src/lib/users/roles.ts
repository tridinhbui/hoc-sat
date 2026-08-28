/**
 * Vai trò hệ thống — dùng chung server VÀ client.
 *
 * Không import từ `db/schema` vì hai lý do: ESLint cấm chạm DB ngoài
 * `lib/repo/*`, và schema kéo theo drizzle vào bundle client. Danh sách
 * này khớp với `ROLES` trong schema; `lib/repo/users.ts` có một khẳng
 * định kiểu để hai bên lệch nhau là gãy ngay ở typecheck.
 */

export const ROLE_VALUES = ["admin", "teacher", "ta", "student"] as const;
export type Role = (typeof ROLE_VALUES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Quản trị",
  teacher: "Giáo viên",
  ta: "Trợ giảng",
  student: "Học sinh",
};

export const isRole = (v: unknown): v is Role =>
  typeof v === "string" && (ROLE_VALUES as readonly string[]).includes(v);
