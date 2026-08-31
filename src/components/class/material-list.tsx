import { Download, FileText, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Cu } from "@/components/mascot/cu";
import { fmtDateTime } from "@/lib/utils/date";
import { deleteMaterialAction } from "@/lib/actions/content";

export type MaterialRow = {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  authorName: string;
  files: { id: string; fileName: string; size: number | null }[];
};

const fmtSize = (n: number) =>
  n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`;

export function MaterialList({
  items,
  classId,
  canDelete,
}: {
  items: MaterialRow[];
  classId: string;
  canDelete: boolean;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          mascot={<Cu pose="sleep" size={110} />}
          title="Chưa có tài liệu nào"
          description="Tài liệu giáo viên đăng sẽ nằm ở đây, tải về lúc nào cũng được."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((m) => (
        <Card key={m.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate">{m.title}</h3>
              <p className="text-[13px] text-muted">
                {m.authorName} · {fmtDateTime(m.createdAt)}
              </p>
              {m.description && <p className="mt-2 whitespace-pre-wrap text-body">{m.description}</p>}
            </div>

            {canDelete && (
              <form action={deleteMaterialAction}>
                <input type="hidden" name="classId" value={classId} />
                <input type="hidden" name="id" value={m.id} />
                <button
                  type="submit"
                  title="Xoá tài liệu"
                  className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-[#4c1979]"
                >
                  <Trash2 size={17} />
                </button>
              </form>
            )}
          </div>

          {m.files.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {m.files.map((f) => (
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
      ))}
    </div>
  );
}
