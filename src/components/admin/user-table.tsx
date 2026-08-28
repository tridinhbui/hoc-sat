"use client";

import { useActionState } from "react";
import { KeyRound, Lock, Unlock } from "lucide-react";
import { resetPasswordAction, setActiveAction, type AdminState } from "@/lib/actions/admin";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { CredentialsPanel } from "./credentials-panel";
import { ROLE_LABEL, type Role } from "@/lib/users/roles";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
  classCount: number;
};

const ROLE_TONE: Record<Role, "brand" | "accent" | "info" | "neutral"> = {
  admin: "brand",
  teacher: "info",
  ta: "accent",
  student: "neutral",
};

export function UserTable({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  // Một state dùng chung cho cả bảng: mỗi lần chỉ thao tác trên một dòng,
  // và mật khẩu tạm trả về cần hiện ở một chỗ cố định.
  const [reset, resetAction] = useActionState<AdminState, FormData>(resetPasswordAction, null);
  const [toggle, toggleAction] = useActionState<AdminState, FormData>(setActiveAction, null);

  return (
    <Card>
      <CardTitle>Tài khoản ({users.length})</CardTitle>

      {(reset?.error || toggle?.error) && (
        <div className="mt-3">
          <Alert>{reset?.error ?? toggle?.error}</Alert>
        </div>
      )}
      {toggle?.ok && (
        <div className="mt-3">
          <Alert tone="success">{toggle.ok}</Alert>
        </div>
      )}
      {reset?.created && <CredentialsPanel users={reset.created} />}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-muted border-line border-b text-left text-xs uppercase">
              <th className="py-2 font-semibold">Người dùng</th>
              <th className="py-2 font-semibold">Vai trò</th>
              <th className="py-2 font-semibold">Lớp</th>
              <th className="py-2 font-semibold">Trạng thái</th>
              <th className="py-2 font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isMe = u.id === currentUserId;
              return (
                <tr key={u.id} className="border-line border-b last:border-0">
                  <td className="py-3">
                    <div className="text-ink font-semibold">{u.name}</div>
                    <div className="text-muted text-[13px]">{u.email}</div>
                  </td>
                  <td className="py-3">
                    <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                  </td>
                  <td className="text-body tnum py-3">{u.classCount || "—"}</td>
                  <td className="py-3">
                    {!u.active ? (
                      <Badge tone="danger">Đã khoá</Badge>
                    ) : u.mustChangePassword ? (
                      <Badge tone="accent">Chưa đổi mật khẩu</Badge>
                    ) : (
                      <Badge tone="success">Đang dùng</Badge>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <form action={resetAction}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="email" value={u.email} />
                        <SubmitButton size="sm" variant="secondary" pendingText="...">
                          <KeyRound /> Đặt lại mật khẩu
                        </SubmitButton>
                      </form>

                      {/* Tự khoá mình là tự nhốt ngoài cửa — repo cũng chặn,
                          ẩn ở đây để khỏi mời người ta bấm vào chỗ sẽ báo lỗi. */}
                      {!isMe && (
                        <form action={toggleAction}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="active" value={u.active ? "0" : "1"} />
                          <SubmitButton
                            size="sm"
                            variant={u.active ? "quiet" : "secondary"}
                            pendingText="..."
                          >
                            {u.active ? <Lock /> : <Unlock />}
                            {u.active ? "Khoá" : "Mở lại"}
                          </SubmitButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
