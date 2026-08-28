import type { Metadata } from "next";
import { requireClassRole } from "@/lib/auth/guard";
import { AssignmentForm } from "@/components/class/assignment-form";

export const metadata: Metadata = { title: "Giao bài mới" };

export default async function NewAssignment({
  params,
}: PageProps<"/ta/classes/[id]/assignments/new">) {
  const { id } = await params;
  await requireClassRole(id, ["ta"]);
  return <AssignmentForm classId={id} />;
}
