import { Pin, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Cu } from "@/components/mascot/cu";
import { fmtDateTime } from "@/lib/utils/date";
import { deleteAnnouncementAction, togglePinAction } from "@/lib/actions/content";

export type AnnouncementRow = {
  id: string;
  content: string;
  pinned: boolean;
  createdAt: Date;
  authorId: string;
  authorName: string;
};

export function AnnouncementList({
  items,
  classId,
  viewerId,
  classRole,
}: {
  items: AnnouncementRow[];
  classId: string;
  viewerId: string;
  classRole: "teacher" | "ta" | "student";
}) {
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState
          mascot={<Cu pose="sleep" size={110} />}
          title="Chưa có thông báo nào"
          description="Thông báo của giáo viên sẽ xuất hiện ở đây."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((a) => {
        // Giáo viên xoá được mọi thông báo; TA chỉ xoá được thông báo của mình.
        const canDelete =
          classRole === "teacher" || (classRole === "ta" && a.authorId === viewerId);

        return (
          <Card key={a.id}>
            <div className="flex gap-3">
              <Avatar name={a.authorName} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{a.authorName}</span>
                  <span className="text-[13px] text-muted">{fmtDateTime(a.createdAt)}</span>
                  {a.pinned && (
                    <Badge tone="accent">
                      <Pin /> Ghim
                    </Badge>
                  )}
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-body">{a.content}</p>
              </div>

              {(classRole === "teacher" || canDelete) && (
                <div className="flex shrink-0 gap-1">
                  {classRole === "teacher" && (
                    <form action={togglePinAction}>
                      <input type="hidden" name="classId" value={classId} />
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="pinned" value={String(!a.pinned)} />
                      <button
                        type="submit"
                        title={a.pinned ? "Bỏ ghim" : "Ghim lên đầu"}
                        className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-[#4c1979]"
                      >
                        <Pin size={17} />
                      </button>
                    </form>
                  )}
                  {canDelete && (
                    <form action={deleteAnnouncementAction}>
                      <input type="hidden" name="classId" value={classId} />
                      <input type="hidden" name="id" value={a.id} />
                      <button
                        type="submit"
                        title="Xoá thông báo"
                        className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-[#4c1979]"
                      >
                        <Trash2 size={17} />
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
