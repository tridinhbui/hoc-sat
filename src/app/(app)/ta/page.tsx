import Link from "next/link";
import { CalendarCheck, ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/auth/guard";
import { listMyClasses } from "@/lib/repo/classes";
import { countUngradedByClass } from "@/lib/repo/assignments";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, SubjectBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Cu } from "@/components/mascot/cu";

export default async function TaHome() {
  const ctx = await requireRole("ta", "admin");
  const [allClasses, ungradedByClass] = await Promise.all([
    listMyClasses(ctx),
    countUngradedByClass(ctx),
  ]);
  const classes = allClasses.filter((c) => c.classRole === "ta");

  return (
    <div className="space-y-6">
      <div>
        <h1>Lớp mình phụ trách</h1>
        <p className="text-sm text-muted">Điểm danh và chấm bài — hai việc chính của hôm nay.</p>
      </div>

      {classes.length === 0 ? (
        <Card>
          <EmptyState
            mascot={<Cu pose="sleep" size={110} />}
            title="Chưa được thêm vào lớp nào"
            description="Giáo viên sẽ thêm bạn vào lớp từ tab Học sinh. Nhắn giáo viên giúp mình nhé."
          />
        </Card>
      ) : (
        <div className="bento">
          {classes.map((c) => (
            <Card key={c.id} className="col-span-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate">{c.name}</h3>
                  <p className="tnum text-[13px] text-muted">Mã lớp {c.code}</p>
                </div>
                <SubjectBadge subject={c.subject} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/ta/classes/${c.id}/attendance`}>
                  <Button size="sm"><CalendarCheck /> Điểm danh hôm nay</Button>
                </Link>
                <Link href={`/ta/classes/${c.id}/assignments`}>
                  <Button size="sm" variant="secondary">
                    <ClipboardList /> Chưa chấm{" "}
                    <Badge tone={(ungradedByClass.get(c.id) ?? 0) > 0 ? "danger" : "neutral"}>
                      {ungradedByClass.get(c.id) ?? 0}
                    </Badge>
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
