import { requireClassRole } from "@/lib/auth/guard";
import { TEACHER_ONLY } from "@/lib/auth/policy";
import { listMaterials } from "@/lib/repo/materials";
import { MaterialUploader } from "@/components/class/material-uploader";
import { MaterialList } from "@/components/class/material-list";

export default async function TeacherMaterials({ params }: PageProps<"/teacher/classes/[id]/materials">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, TEACHER_ONLY);
  const items = await listMaterials(ctx);

  return (
    <div className="space-y-4">
      <MaterialUploader classId={id} />
      <MaterialList items={items} classId={id} canDelete />
    </div>
  );
}
