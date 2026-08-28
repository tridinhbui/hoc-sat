"use client";

import { useActionState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { postAnnouncementAction } from "@/lib/actions/content";

export function AnnouncementComposer({
  classId,
  authorName,
}: {
  classId: string;
  authorName: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(postAnnouncementAction, null);

  return (
    <Card>
      <form
        ref={formRef}
        action={async (fd) => {
          await action(fd);
          formRef.current?.reset();
        }}
        className="space-y-3"
      >
        <input type="hidden" name="classId" value={classId} />
        <div className="flex gap-3">
          <Avatar name={authorName} size={38} />
          <Textarea
            name="content"
            rows={3}
            required
            maxLength={5000}
            placeholder="Thông báo gì cho lớp nào?"
          />
        </div>
        {state?.error && <Alert>{state.error}</Alert>}
        <div className="flex justify-end">
          <SubmitButton size="sm" pendingText="Đang đăng...">
            Đăng thông báo
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}
