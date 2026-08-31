"use client";

import { useActionState } from "react";
import { UserMinus } from "lucide-react";
import { removeMemberAction } from "@/lib/actions/classes";

export function RemoveMemberButton({
  classId,
  memberId,
  name,
}: {
  classId: string;
  memberId: string;
  name: string;
}) {
  const [, action, pending] = useActionState(removeMemberAction, null);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        // Gỡ khỏi lớp là thao tác khó lấy lại — hỏi trước.
        if (!confirm(`Gỡ ${name} khỏi lớp?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="memberId" value={memberId} />
      <button
        type="submit"
        disabled={pending}
        title={`Gỡ ${name} khỏi lớp`}
        className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-danger-soft hover:text-[#4c1979] disabled:opacity-40"
      >
        <UserMinus size={17} />
      </button>
    </form>
  );
}
