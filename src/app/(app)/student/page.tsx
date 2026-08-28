import Link from "next/link";
import { Flame, Sparkles, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { listMyClasses } from "@/lib/repo/classes";
import { listTodoForStudent } from "@/lib/repo/assignments";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { Button } from "@/components/ui/button";
import { Badge, SubjectBadge } from "@/components/ui/badge";
import { relativeDue } from "@/lib/utils/date";
import { EmptyState } from "@/components/ui/empty-state";
import { Cu } from "@/components/mascot/cu";

export default async function StudentHome() {
  const ctx = await requireRole("student", "admin");
  const [classes, todo] = await Promise.all([listMyClasses(ctx), listTodoForStudent(ctx)]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1>Chào {ctx.user.name.split(" ").slice(-1)[0]} 👋</h1>
          <p className="text-sm text-muted">Học một chút hôm nay nhé.</p>
        </div>
        <Link href="/student/join">
          <Button variant="secondary"><Plus /> Vào lớp</Button>
        </Link>
      </div>

      <div className="bento">
        <Card className="col-span-6">
          <CardHeader>
            <CardTitle>Việc cần làm</CardTitle>
            {todo.length > 0 && <Badge tone="accent">{todo.length}</Badge>}
          </CardHeader>
          {todo.length === 0 ? (
            <p className="text-sm text-muted">Không còn bài nào phải nộp. Thảnh thơi 🎉</p>
          ) : (
            <ul className="space-y-2">
              {todo.map((t) => (
                <li key={t.assignmentId}>
                  <Link
                    href={`/student/classes/${t.classId}/assignments/${t.assignmentId}`}
                    className="rise flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line px-4 py-3"
                  >
                    <span className="min-w-0 truncate font-semibold text-ink">{t.title}</span>
                    {t.dueAt && (
                      <Badge tone={t.overdue ? "danger" : "neutral"}>
                        {t.overdue ? "Quá hạn" : relativeDue(t.dueAt)}
                      </Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <StatTile className="col-span-3" label="Streak" value="0" hint="ngày liên tiếp" tone="accent" icon={<Flame size={16} />} />
        <StatTile className="col-span-3" label="XP tuần này" value="0" tone="accent" icon={<Sparkles size={16} />} />

        <Card className="col-span-6">
          <CardHeader><CardTitle>Lớp của tôi</CardTitle></CardHeader>
          {classes.length === 0 ? (
            <EmptyState
              mascot={<Cu pose="sleep" size={110} />}
              title="Chưa vào lớp nào. Cú đang ngủ 💤"
              description="Nhập mã lớp giáo viên cho để vào lớp nhé."
              action={<Link href="/student/join"><Button>Nhập mã lớp</Button></Link>}
            />
          ) : (
            <ul className="space-y-2">
              {classes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/student/classes/${c.id}/stream`}
                    className="rise flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line px-4 py-3"
                  >
                    <span className="truncate font-semibold text-ink">{c.name}</span>
                    <SubjectBadge subject={c.subject} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="col-span-6">
          <CardHeader><CardTitle>Điểm gần đây</CardTitle></CardHeader>
          <p className="text-sm text-muted">
            Mở tab Điểm trong từng lớp để xem điểm và nhận xét của giáo viên.
          </p>
        </Card>

        <Card className="col-span-12">
          <CardHeader><CardTitle>Lịch tuần này</CardTitle></CardHeader>
          <p className="text-sm text-muted">Calendar lên ở P5.</p>
        </Card>
      </div>
    </div>
  );
}
