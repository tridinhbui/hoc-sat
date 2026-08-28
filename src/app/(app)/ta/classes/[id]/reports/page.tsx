import { requireClassRole } from "@/lib/auth/guard";
import { classReport } from "@/lib/repo/reports";
import { vnDateKey } from "@/lib/utils/date";
import { ReportTable } from "@/components/reports/report-table";

export default async function Reports({ params }: PageProps<"/ta/classes/[id]/reports">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, ["ta"]);
  const rows = await classReport(ctx);

  return <ReportTable rows={rows} className={ctx.klass.name} today={vnDateKey()} />;
}
