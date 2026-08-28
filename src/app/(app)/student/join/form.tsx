"use client";

import { useActionState } from "react";
import { Card } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { Cu } from "@/components/mascot/cu";
import { joinClassAction } from "@/lib/actions/classes";

export function JoinForm() {
  const [state, action] = useActionState(joinClassAction, null);

  return (
    <div className="mx-auto max-w-[420px] space-y-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <Cu pose="wave" size={100} />
        <h1>Nhập mã lớp</h1>
        <p className="text-sm text-muted">Mã gồm 6 ký tự, giáo viên sẽ cho bạn.</p>
      </div>

      <Card>
        <form action={action} className="space-y-4">
          <Field label="Mã lớp">
            <Input
              name="code"
              required
              autoFocus
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="RWX24A"
              className="tnum text-center font-display text-xl font-extrabold tracking-[0.25em] uppercase"
            />
          </Field>

          {state?.error && <Alert>{state.error}</Alert>}

          <SubmitButton block pendingText="Đang vào lớp...">
            Vào lớp
          </SubmitButton>
        </form>
      </Card>
    </div>
  );
}
