import { requireClassRole } from "@/lib/auth/guard";
import { ANY_MEMBER } from "@/lib/auth/policy";
import { myAttendance } from "@/lib/repo/attendance";
import { MyAttendance } from "@/components/attendance/my-attendance";

export default async function StudentAttendance({
  params,
}: PageProps<"/student/classes/[id]/attendance">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, ANY_MEMBER);
  const data = await myAttendance(ctx);

  return <MyAttendance data={data} />;
}
