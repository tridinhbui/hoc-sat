import { requireClassRole } from "@/lib/auth/guard";
import { TEACHER_ONLY } from "@/lib/auth/policy";
import { classReport } from "@/lib/repo/reports";
import { vnDateKey } from "@/lib/utils/date";
import { ReportTable } from "@/components/reports/report-table";

export default async function Reports({ params }: PageProps<"/teacher/classes/[id]/reports">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, TEACHER_ONLY);
  const rows = await classReport(ctx);

  return <ReportTable rows={rows} className={ctx.klass.name} today={vnDateKey()} />;
}
