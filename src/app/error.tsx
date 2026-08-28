"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Trang lỗi dùng tone TRUNG TÍNH — không mascot, không emoji.
 * Xem DESIGN.md §1 và §9: playful chỉ dành cho luồng bình thường.
 */
export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const forbidden = error.name === "ForbiddenError";

  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <Card className="w-full max-w-[440px] text-center">
        <h2 className="mb-2">{forbidden ? "Không có quyền truy cập" : "Đã xảy ra lỗi"}</h2>
        <p className="mb-5 text-sm text-muted">
          {forbidden
            ? error.message
            : "Hệ thống gặp sự cố khi xử lý yêu cầu. Nếu lặp lại, báo giúp bộ phận kỹ thuật."}
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="secondary" onClick={reset}>Thử lại</Button>
          <Button onClick={() => router.push("/dashboard")}>Về trang chủ</Button>
        </div>
      </Card>
    </main>
  );
}
