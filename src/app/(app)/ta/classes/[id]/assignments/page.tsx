import { requireClassRole } from "@/lib/auth/guard";
import { listAssignments } from "@/lib/repo/assignments";
import { AssignmentList } from "@/components/class/assignment-list";

export default async function Assignments({
  params,
}: PageProps<"/ta/classes/[id]/assignments">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, ["ta"]);
  const items = await listAssignments(ctx);

  return <AssignmentList items={items} basePath={`/ta/classes/${id}/assignments`} canCreate />;
}
