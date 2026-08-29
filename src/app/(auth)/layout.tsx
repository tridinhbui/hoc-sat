import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Lumi } from "@/components/mascot/lumi";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center bg-bg px-5 py-10">
      {/* Nút quay lại trang chủ góc trên bên trái */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold text-muted shadow-2xs transition-all hover:border-primary hover:text-primary hover:shadow-xs"
        >
          <ArrowLeft size={15} />
          <span>Quay lại trang chủ</span>
        </Link>
      </div>

      <div className="fade-up w-full max-w-[420px]">
        <div className="mb-6 flex flex-col items-center gap-2.5 text-center">
          <Lumi pose="wave" size={96} />
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-white shadow-xs">
              <Sparkles size={16} />
            </span>
            <span className="font-display text-2xl font-black tracking-tight text-ink">
              HocSAT<span className="text-primary">.ai</span>
            </span>
          </div>
          <p className="text-xs font-semibold text-muted">
            Đăng nhập để tiếp tục lộ trình Digital SAT
          </p>
        </div>

        {children}

        {/* Nút quay lại phụ ngay dưới form phòng khi xem trên màn hình nhỏ */}
        <div className="mt-5 text-center sm:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-primary"
          >
            <ArrowLeft size={13} />
            <span>Quay lại trang chủ</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
