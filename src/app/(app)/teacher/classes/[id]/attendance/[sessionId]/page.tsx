import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireClassRole } from "@/lib/auth/guard";
import { TEACHER_ONLY } from "@/lib/auth/policy";
import { getSessionSheet } from "@/lib/repo/attendance";
import { SessionSheet } from "@/components/attendance/session-sheet";

export default async function SessionPage({
  params,
}: PageProps<"/teacher/classes/[id]/attendance/[sessionId]">) {
  const { id, sessionId } = await params;
  const ctx = await requireClassRole(id, TEACHER_ONLY);
  const { session, roster } = await getSessionSheet(ctx, sessionId);

  return (
    <div className="space-y-4">
      <Link
        href={`/teacher/classes/${id}/attendance`}
        className="flex w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"
      >
        <ArrowLeft size={16} /> Tất cả buổi
      </Link>

      <SessionSheet
        classId={id}
        sessionId={sessionId}
        sessionDate={session.sessionDate}
        title={session.title}
        roster={roster}
        canDelete={ctx.classRole === "teacher"}
      />
    </div>
  );
}
