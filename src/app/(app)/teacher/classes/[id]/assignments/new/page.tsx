import type { Metadata } from "next";
import { requireClassRole } from "@/lib/auth/guard";
import { TEACHER_ONLY } from "@/lib/auth/policy";
import { AssignmentForm } from "@/components/class/assignment-form";

export const metadata: Metadata = { title: "Giao bài mới" };

export default async function NewAssignment({
  params,
}: PageProps<"/teacher/classes/[id]/assignments/new">) {
  const { id } = await params;
  await requireClassRole(id, TEACHER_ONLY);
  return <AssignmentForm classId={id} />;
}
