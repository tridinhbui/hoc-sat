import { SubjectBadge } from "@/components/ui/badge";
import { ClassCode } from "./class-code";
import { ClassTabs, type Tab } from "./class-tabs";

export function ClassHeader({
  name,
  code,
  subject,
  scheduleNote,
  showCode,
  tabs,
}: {
  name: string;
  code: string;
  subject: "rw" | "math";
  scheduleNote?: string | null;
  /** Học sinh không cần thấy mã lớp — chỉ giáo viên và TA cần đọc cho người mới. */
  showCode: boolean;
  tabs: Tab[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <SubjectBadge subject={subject} />
          </div>
          <h1 className="truncate">{name}</h1>
          {scheduleNote && <p className="text-sm text-muted">{scheduleNote}</p>}
        </div>
        {showCode && <ClassCode code={code} />}
      </div>
      <ClassTabs tabs={tabs} />
    </div>
  );
}
