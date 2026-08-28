import { requireClassRole } from "@/lib/auth/guard";
import { ANY_MEMBER } from "@/lib/auth/policy";
import { listAnnouncements } from "@/lib/repo/announcements";
import { AnnouncementList } from "@/components/class/announcement-list";

export default async function StudentStream({ params }: PageProps<"/student/classes/[id]/stream">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, ANY_MEMBER);
  const items = await listAnnouncements(ctx);

  return (
    <AnnouncementList
      items={items}
      classId={id}
      viewerId={ctx.user.id}
      classRole={ctx.classRole}
    />
  );
}
