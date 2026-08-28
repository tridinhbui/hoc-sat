import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { countClassesForUsers, listAllUsers } from "@/lib/repo/users";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { ImportUsersForm } from "@/components/admin/import-users-form";
import { UserTable, type UserRow } from "@/components/admin/user-table";

export const metadata: Metadata = { title: "Tài khoản" };

export default async function AdminUsersPage() {
  const ctx = await requireRole("admin");

  const users = await listAllUsers(ctx);
  const classCounts = await countClassesForUsers(
    ctx,
    users.map((u) => u.id),
  );

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    mustChangePassword: u.mustChangePassword,
    classCount: classCounts.get(u.id) ?? 0,
  }));

  return (
    <div className="grid gap-5">
      <div>
        <h1>Tài khoản</h1>
        <p className="text-muted mt-1">
          Tạo tài khoản cho giáo viên, trợ giảng và học sinh. Người dùng đổi mật khẩu ở lần đăng
          nhập đầu.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <CreateUserForm />
        <ImportUsersForm />
      </div>

      <UserTable users={rows} currentUserId={ctx.user.id} />
    </div>
  );
}
