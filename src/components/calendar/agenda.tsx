import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Cu } from "@/components/mascot/cu";
import { fmtDateTime, fmtTime } from "@/lib/utils/date";
import { EVENT_LABEL, type FeedItem } from "@/lib/calendar/types";
import { deleteEventAction } from "@/lib/actions/calendar";
import { Trash2 } from "lucide-react";

const TONE: Record<string, "accent" | "danger" | "brand" | "info"> = {
  deadline: "accent",
  midterm: "danger",
  final: "danger",
  class: "brand",
  other: "info",
};

/**
 * Danh sách sắp tới. Lưới tháng cho cái nhìn tổng thể, phần này mới là chỗ
 * đọc được chi tiết — nhất là trên điện thoại.
 */
export function Agenda({
  items,
  canEdit,
  title = "Sắp tới",
}: {
  items: FeedItem[];
  /** Lớp mà người xem là giáo viên — chỉ mục tự tạo mới xoá được */
  canEdit: Set<string>;
  title?: string;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          mascot={<Cu pose="sleep" size={110} />}
          title="Không có gì trong khoảng này"
          description="Hạn nộp bài và lịch thi sẽ tự hiện ở đây, không cần nhập tay."
        />
      </Card>
    );
  }

  return (
    <Card className="p-0">
      <div className="p-5">
        <CardHeader className="mb-0">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{items.length} mục</CardDescription>
          </div>
        </CardHeader>
      </div>

      <ul className="border-t border-line">
        {items.map((it) => (
          <li
            key={it.id}
            className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 last:border-0"
          >
            <span className="w-[92px] shrink-0">
              <span className="tnum block text-sm font-bold text-ink">
                {it.allDay ? "Cả ngày" : fmtTime(it.startAt)}
              </span>
              <span className="tnum block text-[12px] text-muted">{it.dateKey}</span>
            </span>

            <span className="min-w-0 flex-1">
              {it.href ? (
                <Link href={it.href} className="block truncate font-semibold text-ink hover:text-primary">
                  {it.title}
                </Link>
              ) : (
                <span className="block truncate font-semibold text-ink">{it.title}</span>
              )}
              <span className="block truncate text-[13px] text-muted">
                {it.className}
                {it.endAt && !it.allDay ? ` · đến ${fmtDateTime(it.endAt)}` : ""}
              </span>
            </span>

            <Badge tone={TONE[it.type] ?? "info"}>{EVENT_LABEL[it.type]}</Badge>

            {/* Hạn nộp và lịch thi sinh từ dữ liệu gốc — sửa ở bài tập / đề thi,
                không sửa được ở đây. */}
            {it.source === "event" && canEdit.has(it.classId) && (
              <form action={deleteEventAction}>
                <input type="hidden" name="classId" value={it.classId} />
                <input type="hidden" name="eventId" value={it.id} />
                <button
                  type="submit"
                  title="Xoá khỏi lịch"
                  className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-[#4c1979]"
                >
                  <Trash2 size={16} />
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
