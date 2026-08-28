import { requireClassRole } from "@/lib/auth/guard";
import { TEACHER_ONLY } from "@/lib/auth/policy";
import { SettingsForm } from "./form";

export default async function Settings({ params }: PageProps<"/teacher/classes/[id]/settings">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, TEACHER_ONLY);

  return (
    <SettingsForm
      classId={id}
      name={ctx.klass.name}
      scheduleNote={ctx.klass.scheduleNote ?? ""}
      archived={ctx.klass.archived}
      code={ctx.klass.code}
    />
  );
}
