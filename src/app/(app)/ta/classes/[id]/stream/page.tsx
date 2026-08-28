import { requireClassRole } from "@/lib/auth/guard";
import { listAnnouncements } from "@/lib/repo/announcements";
import { AnnouncementComposer } from "@/components/class/announcement-composer";
import { AnnouncementList } from "@/components/class/announcement-list";

export default async function TaStream({ params }: PageProps<"/ta/classes/[id]/stream">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, ["ta"]);
  const items = await listAnnouncements(ctx);

  return (
    <div className="space-y-4">
      <AnnouncementComposer classId={id} authorName={ctx.user.name} />
      <AnnouncementList
        items={items}
        classId={id}
        viewerId={ctx.user.id}
        classRole={ctx.classRole}
      />
    </div>
  );
}
