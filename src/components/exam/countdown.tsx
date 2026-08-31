"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Đồng hồ đếm ngược.
 *
 * Chỉ là phần HIỂN THỊ. Mốc hết giờ do server chốt trong `expires_at`;
 * sửa đồng hồ này không mua thêm được giây nào vì mọi lần ghi đáp án đều
 * được server đối chiếu lại.
 */
export function Countdown({
  expiresAt,
  onExpire,
}: {
  /** unix ms */
  expiresAt: number;
  onExpire: () => void;
}) {
  // Khởi tạo một lần; khi đổi module, parent truyền key={expiresAt} để
  // component remount với mốc mới thay vì setState đồng bộ trong effect.
  const [left, setLeft] = useState(() => expiresAt - Date.now());

  useEffect(() => {
    const t = setInterval(() => {
      const ms = expiresAt - Date.now();
      setLeft(ms);
      if (ms <= 0) {
        clearInterval(t);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(t);
    // onExpire cố tình không nằm trong deps: đổi tham chiếu mỗi render sẽ
    // dựng lại interval liên tục và đồng hồ giật.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const total = Math.max(0, Math.floor(left / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");

  const warn = total <= 300;
  const critical = total <= 60;

  return (
    <div
      // Đọc mốc 5 phút và 1 phút cho người dùng trình đọc màn hình.
      aria-live={critical ? "assertive" : "polite"}
      aria-atomic="true"
      className={cn(
        "tnum rounded-full px-4 py-2 font-display text-xl font-extrabold tabular-nums",
        critical
          ? "bg-[#c7f000] text-white"
          : warn
            ? "bg-[#c7f000] text-[#2b0e45]"
            : "bg-white/10 text-white",
      )}
    >
      {mm}:{ss}
      <span className="sr-only">
        {critical ? ", còn dưới một phút" : warn ? ", còn dưới năm phút" : ""}
      </span>
    </div>
  );
}
