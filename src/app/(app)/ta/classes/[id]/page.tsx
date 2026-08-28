import { redirect } from "next/navigation";

export default async function TaClassIndex({ params }: PageProps<"/ta/classes/[id]">) {
  const { id } = await params;
  redirect(`/ta/classes/${id}/stream`);
}
