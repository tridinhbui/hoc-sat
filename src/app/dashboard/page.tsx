import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";

/** Cửa vào duy nhất — đẩy về đúng dashboard theo role. */
export default async function DashboardRedirect() {
  const { user } = await requireUser();
  redirect(
    user.role === "admin" ? "/admin/users"
      : user.role === "teacher" ? "/teacher"
      : user.role === "ta" ? "/ta"
      : "/student",
  );
}
