import { redirect } from "next/navigation";

export default async function TeacherClassIndex({ params }: PageProps<"/teacher/classes/[id]">) {
  const { id } = await params;
  redirect(`/teacher/classes/${id}/stream`);
}
