import { redirect } from "next/navigation";

export default async function StudentClassIndex({ params }: PageProps<"/student/classes/[id]">) {
  const { id } = await params;
  redirect(`/student/classes/${id}/stream`);
}
