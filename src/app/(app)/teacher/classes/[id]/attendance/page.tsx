import { requireClassRole } from "@/lib/auth/guard";
import { TEACHER_ONLY } from "@/lib/auth/policy";
import { attendanceSummary, listSessions, markedTodayByClass } from "@/lib/repo/attendance";
import { countMembers } from "@/lib/repo/classes";
import { vnDateKey } from "@/lib/utils/date";
import { SessionList } from "@/components/attendance/session-list";
import { AttendanceSummary } from "@/components/attendance/summary";

export default async function Attendance({
  params,
}: PageProps<"/teacher/classes/[id]/attendance">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, TEACHER_ONLY);
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
        basePath={`/teacher/classes/${id}/attendance`}
        sessions={sessions}
        today={vnDateKey()}
        markedToday={marked.has(id)}
        totalStudents={members.student}
      />
      <AttendanceSummary rows={summary} />
    </div>
  );
}
