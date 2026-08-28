import { requireClassRole } from "@/lib/auth/guard";
import { TEACHER_ONLY } from "@/lib/auth/policy";
import { listAnnouncements } from "@/lib/repo/announcements";
import { AnnouncementComposer } from "@/components/class/announcement-composer";
import { AnnouncementList } from "@/components/class/announcement-list";

export default async function TeacherStream({ params }: PageProps<"/teacher/classes/[id]/stream">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, TEACHER_ONLY);
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
