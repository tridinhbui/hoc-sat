import { Cu } from "@/components/mascot/cu";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="fade-up w-full max-w-[400px]">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <Cu pose="wave" size={104} />
          <h1 className="font-display text-[28px] font-extrabold text-ink">HocSAT</h1>
          <p className="text-sm text-muted">Học SAT cùng Cú 🦉</p>
        </div>
        {children}
      </div>
    </main>
  );
}
