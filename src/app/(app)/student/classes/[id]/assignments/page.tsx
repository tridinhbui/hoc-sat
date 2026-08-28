import { requireClassRole } from "@/lib/auth/guard";
import { ANY_MEMBER } from "@/lib/auth/policy";
import { listAssignments } from "@/lib/repo/assignments";
import { AssignmentList } from "@/components/class/assignment-list";

export default async function StudentAssignments({
  params,
}: PageProps<"/student/classes/[id]/assignments">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, ANY_MEMBER);
  const items = await listAssignments(ctx);

  return (
    <AssignmentList
      items={items}
      basePath={`/student/classes/${id}/assignments`}
      canCreate={false}
    />
  );
}
