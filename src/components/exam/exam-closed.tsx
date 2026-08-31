import Link from "next/link";

/** Màn thông báo ngoài giờ thi. Tone trung tính, không mascot. */
export function ExamClosed({ message, detail }: { message: string; detail?: string }) {
  return (
    <main className="exam-mode grid min-h-dvh place-items-center px-5">
      <div className="max-w-[440px] text-center">
        <h1 className="mb-3">{message}</h1>
        {detail && <p className="mb-6 text-[#d8c9e8]">{detail}</p>}
        <Link
          href="/dashboard"
          className="inline-block rounded-full bg-white px-6 py-3 font-semibold text-[#2b0e45]"
        >
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
