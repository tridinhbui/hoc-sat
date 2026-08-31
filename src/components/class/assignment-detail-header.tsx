import { CalendarClock, Download, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime, relativeDue } from "@/lib/utils/date";
import { fmtSize } from "./file-picker";

export function AssignmentDetailHeader({
  title,
  description,
  dueAt,
  points,
  publishedAt,
  allowLate,
  overdue,
  files,
}: {
  title: string;
  description: string | null;
  dueAt: Date | null;
  points: number;
  publishedAt: Date | null;
  allowLate: boolean;
  overdue: boolean;
  files: { id: string; fileName: string; size: number | null }[];
}) {
  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {!publishedAt && <Badge tone="accent">Nháp, học sinh chưa thấy</Badge>}
        {dueAt && (
          <Badge tone={overdue ? "danger" : "neutral"}>
            <CalendarClock />
            {overdue ? "Quá hạn" : relativeDue(dueAt)}
          </Badge>
        )}
        {!allowLate && <Badge tone="danger">Không nhận nộp trễ</Badge>}
      </div>

      <h2>{title}</h2>
      <p className="text-[13px] text-muted">
        {dueAt ? `Hạn nộp ${fmtDateTime(dueAt)}` : "Không có hạn nộp"} · {points} điểm
      </p>

      {description && <p className="mt-3 whitespace-pre-wrap text-body">{description}</p>}

      {files.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {files.map((f) => (
            <li key={f.id}>
              <a
                href={`/api/attachments/${f.id}`}
                className="rise flex items-center gap-2.5 rounded-[var(--radius-md)] border border-line px-3 py-2.5"
              >
                <FileText size={17} className="shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">
                  {f.fileName}
                </span>
                {f.size != null && (
                  <span className="tnum shrink-0 text-[12px] text-muted">{fmtSize(f.size)}</span>
                )}
                <Download size={16} className="shrink-0 text-muted" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
