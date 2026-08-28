import { requireClassRole } from "@/lib/auth/guard";
import { TEACHER_ONLY } from "@/lib/auth/policy";
import { listAssignments } from "@/lib/repo/assignments";
import { AssignmentList } from "@/components/class/assignment-list";

export default async function Assignments({
  params,
}: PageProps<"/teacher/classes/[id]/assignments">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, TEACHER_ONLY);
  const items = await listAssignments(ctx);

  return <AssignmentList items={items} basePath={`/teacher/classes/${id}/assignments`} canCreate />;
}
