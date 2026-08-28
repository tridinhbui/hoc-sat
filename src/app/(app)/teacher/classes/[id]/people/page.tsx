import { requireClassRole } from "@/lib/auth/guard";
import { TEACHER_ONLY } from "@/lib/auth/policy";
import { listRoster } from "@/lib/repo/classes";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AddMemberForm } from "./add-member-form";
import { RemoveMemberButton } from "./remove-member-button";

const ROLE_LABEL = { teacher: "Giáo viên", ta: "Trợ giảng", student: "Học sinh" } as const;
const ROLE_TONE = { teacher: "brand", ta: "info", student: "neutral" } as const;

export default async function People({ params }: PageProps<"/teacher/classes/[id]/people">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, TEACHER_ONLY);
  const roster = await listRoster(ctx);

  const groups = (["teacher", "ta", "student"] as const).map((role) => ({
    role,
    members: roster.filter((m) => m.classRole === role),
  }));

  return (
    <div className="bento">
      <div className="col-span-7 space-y-4">
        {groups.map(({ role, members }) => (
          <Card key={role}>
            <CardHeader>
              <div>
                <CardTitle>{ROLE_LABEL[role]}</CardTitle>
                <CardDescription>{members.length} người</CardDescription>
              </div>
            </CardHeader>

            {members.length === 0 ? (
              <p className="text-sm text-muted">Chưa có ai.</p>
            ) : (
              <ul className="space-y-1">
                {members.map((m) => (
                  <li
                    key={m.memberId}
                    className="flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 hover:bg-sunken"
                  >
                    <Avatar name={m.name} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{m.name}</p>
                      <p className="truncate text-[13px] text-muted">{m.email}</p>
                    </div>
                    <Badge tone={ROLE_TONE[role]}>{ROLE_LABEL[role]}</Badge>
                    {role !== "teacher" && (
                      <RemoveMemberButton classId={id} memberId={m.memberId} name={m.name} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      <div className="col-span-5">
        <AddMemberForm classId={id} />
      </div>
    </div>
  );
}
