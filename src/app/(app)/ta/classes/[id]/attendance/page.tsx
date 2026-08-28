import { requireClassRole } from "@/lib/auth/guard";
import { attendanceSummary, listSessions, markedTodayByClass } from "@/lib/repo/attendance";
import { countMembers } from "@/lib/repo/classes";
import { vnDateKey } from "@/lib/utils/date";
import { SessionList } from "@/components/attendance/session-list";
import { AttendanceSummary } from "@/components/attendance/summary";

export default async function Attendance({
  params,
}: PageProps<"/ta/classes/[id]/attendance">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, ["ta"]);
  const [sessions, summary, members, marked] = await Promise.all([
    listSessions(ctx),
    attendanceSummary(ctx),
    countMembers(ctx),
    markedTodayByClass(ctx),
  ]);

  return (
    <div className="space-y-4">
      <SessionList
        classId={id}
        basePath={`/ta/classes/${id}/attendance`}
        sessions={sessions}
        today={vnDateKey()}
        markedToday={marked.has(id)}
        totalStudents={members.student}
      />
      <AttendanceSummary rows={summary} />
    </div>
  );
}
