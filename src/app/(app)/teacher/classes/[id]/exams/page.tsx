import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";
import { requireClassRole } from "@/lib/auth/guard";
import { TEACHER_ONLY } from "@/lib/auth/policy";
import { listExams } from "@/lib/repo/exams";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Cu } from "@/components/mascot/cu";
import { fmtDateTime } from "@/lib/utils/date";
import { EXAM_KIND_LABEL, type ExamKind } from "@/lib/exam/types";

export default async function Exams({ params }: PageProps<"/teacher/classes/[id]/exams">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, TEACHER_ONLY);
  const items = await listExams(ctx);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href={`/teacher/classes/${id}/exams/new`}>
          <Button size="sm">
            <Plus /> Tạo đề thi
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState
            mascot={<Cu pose="magnify" size={110} />}
            title="Chưa có đề thi nào"
            description="Tạo đề midterm hoặc final, hệ thống dùng sẵn preset SAT."
            action={
              <Link href={`/teacher/classes/${id}/exams/new`}>
                <Button>
                  <Plus /> Tạo đề thi
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        items.map((e) => (
          <Card key={e.id} className="p-0">
            <Link
              href={`/teacher/classes/${id}/exams/${e.id}`}
              className="rise block rounded-[var(--radius-lg)] p-5"
            >
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge tone="brand">{EXAM_KIND_LABEL[e.kind as ExamKind]}</Badge>
                {e.lockdown && (
                  <Badge tone="danger">
                    <ShieldCheck /> Khoá màn hình
                  </Badge>
                )}
                {e.released && <Badge tone="success">Đã trả kết quả</Badge>}
              </div>
              <h3>{e.title}</h3>
              <p className="text-[13px] text-muted">
                {fmtDateTime(e.openAt)} → {fmtDateTime(e.closeAt)} · {e.modules.length} module
              </p>
            </Link>
          </Card>
        ))
      )}
    </div>
  );
}
