import Link from "next/link";
import { BookOpen, ClipboardCheck, Clock, Users, Plus } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { listMyClasses } from "@/lib/repo/classes";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "@/components/ui/stat-tile";
import { Button } from "@/components/ui/button";
import { SubjectBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Cu } from "@/components/mascot/cu";

export default async function TeacherHome() {
  const ctx = await requireRole("teacher", "admin");
  const classes = await listMyClasses(ctx);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1>Chào {ctx.user.name.split(" ").slice(-1)[0]} 👋</h1>
          <p className="text-sm text-muted">Hôm nay lớp mình có gì nào.</p>
        </div>
        <Link href="/teacher/classes/new">
          <Button><Plus /> Tạo lớp</Button>
        </Link>
      </div>

      <div className="bento">
        <StatTile className="col-span-3" label="Lớp đang dạy" value={classes.length} icon={<BookOpen size={16} />} />
        <StatTile className="col-span-3" label="Chưa chấm" value="—" hint="Có ở P2" tone="danger" icon={<ClipboardCheck size={16} />} />
        <StatTile className="col-span-3" label="Sắp đến hạn" value="—" hint="Có ở P2" tone="accent" icon={<Clock size={16} />} />
        <StatTile className="col-span-3" label="Học sinh" value="—" hint="Có ở P1" tone="success" icon={<Users size={16} />} />

        <Card className="col-span-7">
          <CardHeader><CardTitle>Lớp của tôi</CardTitle></CardHeader>
          {classes.length === 0 ? (
            <EmptyState
              mascot={<Cu pose="sleep" size={110} />}
              title="Chưa có lớp nào"
              description="Tạo lớp đầu tiên, chọn Reading &amp; Writing hoặc Math rồi gửi mã cho học sinh."
              action={<Link href="/teacher/classes/new"><Button><Plus /> Tạo lớp</Button></Link>}
            />
          ) : (
            <ul className="space-y-2">
              {classes.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/teacher/classes/${c.id}/stream`}
                    className="rise flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line px-4 py-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{c.name}</span>
                      <span className="tnum text-[13px] text-muted">Mã lớp {c.code}</span>
                    </span>
                    <SubjectBadge subject={c.subject} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="col-span-5">
          <CardHeader><CardTitle>Cần chấm gấp</CardTitle></CardHeader>
          <p className="text-sm text-muted">Hàng chờ chấm bài sẽ xuất hiện ở đây từ giai đoạn P2.</p>
        </Card>

        <Card className="col-span-12">
          <CardHeader><CardTitle>Câu sai nhiều nhất tuần này</CardTitle></CardHeader>
          <p className="text-sm text-muted">
            Heatmap câu × học sinh sẽ lên ở P3, ngay khi có auto-chấm trắc nghiệm.
          </p>
        </Card>
      </div>
    </div>
  );
}
