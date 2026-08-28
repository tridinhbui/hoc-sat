import { requireClassRole } from "@/lib/auth/guard";
import { ANY_MEMBER } from "@/lib/auth/policy";
import { listMaterials } from "@/lib/repo/materials";
import { MaterialList } from "@/components/class/material-list";

export default async function StudentMaterials({
  params,
}: PageProps<"/student/classes/[id]/materials">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, ANY_MEMBER);
  const items = await listMaterials(ctx);

  return <MaterialList items={items} classId={id} canDelete={false} />;
}
