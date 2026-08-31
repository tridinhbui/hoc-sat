"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { cn } from "@/lib/utils/cn";

/**
 * Đăng xuất.
 *
 * Phải đi qua `authClient` chứ không phải `<form method="post">`: form gửi
 * `application/x-www-form-urlencoded`, còn better-auth chỉ nhận JSON và trả
 * 415 — nút cũ trông vẫn bấm được nhưng phiên không hề bị xoá.
 */
export function SignOutButton({
  variant = "full",
  className,
}: {
  /** "full" = nút có chữ cho sidebar; "icon" = chỉ icon cho thanh trên mobile. */
  variant?: "full" | "icon";
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    await signOut();
    // replace chứ không push: nút Back sau khi đăng xuất không được quay lại
    // trang trong ứng dụng. refresh để xoá cache RSC còn giữ dữ liệu phiên cũ.
    router.replace("/login");
    router.refresh();
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-label="Đăng xuất"
        className={cn(
          "grid size-9 place-items-center rounded-full text-muted transition-colors",
          "active:bg-danger-soft active:text-[#4c1979] disabled:opacity-50",
          className,
        )}
      >
        <LogOut size={18} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-semibold text-muted",
        "transition-colors hover:bg-danger-soft hover:text-[#4c1979] disabled:opacity-50",
        className,
      )}
    >
      <LogOut size={18} />
      {busy ? "Đang thoát…" : "Đăng xuất"}
    </button>
  );
}
