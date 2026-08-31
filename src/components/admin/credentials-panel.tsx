"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { CreatedUser } from "@/lib/repo/users";
import { Button } from "@/components/ui/button";

/**
 * Mật khẩu tạm hiện đúng một lần, ngay sau khi tạo hoặc đặt lại. Không
 * lưu ở đâu cả — đóng trang là mất, phải đặt lại. Nói rõ điều đó thay vì
 * để admin tưởng lát nữa quay lại vẫn xem được.
 */
export function CredentialsPanel({ users }: { users: CreatedUser[] }) {
  const [copied, setCopied] = useState(false);

  if (users.length === 0) return null;

  const text = users.map((u) => `${u.email}\t${u.tempPassword}`).join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Trình duyệt chặn clipboard — bảng bên dưới vẫn bôi đen chép tay được.
    }
  };

  return (
    <div className="border-accent bg-accent-soft mt-4 rounded-[var(--radius-lg)] border p-4">
      <p className="text-[13px] font-semibold text-[#4c1979]">
        Mật khẩu tạm chỉ hiện lần này. Chép lại trước khi rời trang, mất thì phải đặt lại.
      </p>

      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-muted text-left text-xs uppercase">
            <th className="py-1 font-semibold">Email</th>
            <th className="py-1 font-semibold">Mật khẩu tạm</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-line border-t">
              <td className="text-body py-1.5">{u.email}</td>
              <td className="text-ink py-1.5 font-mono font-semibold">{u.tempPassword}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Button size="sm" variant="secondary" className="mt-3" onClick={copy}>
        {copied ? <Check /> : <Copy />}
        {copied ? "Đã chép" : "Chép tất cả"}
      </Button>
    </div>
  );
}
