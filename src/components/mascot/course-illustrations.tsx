import { cn } from "@/lib/utils/cn";

export function MathCourseIllustration({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative h-44 w-full overflow-hidden rounded-t-[var(--radius-lg)] bg-gradient-to-br from-primary-soft via-primary-soft to-primary-soft p-5",
        className,
      )}
    >
      {/* Badge version góc phải */}
      <span className="absolute right-4 top-4 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
        Cập nhật 2026
      </span>

      {/* Brand logo mờ */}
      <div className="flex items-center gap-1 text-xs font-black tracking-tight text-primary/60">
        <span className="grid size-4 place-items-center rounded-full bg-primary text-[10px] text-white">H</span>
        AtlasSAT
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <span className="font-display text-2xl font-black tracking-tight text-primary">
            SAT <span className="text-primary">Math</span>
          </span>
          <p className="text-xs font-semibold text-primary/80">Problem Solving & Advanced Math</p>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-bold text-primary shadow-xs backdrop-blur-xs">
              f(x) = ax² + b
            </span>
            <span className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-bold text-primary shadow-xs backdrop-blur-xs">
              Desmos
            </span>
          </div>
        </div>

        {/* Minh họa đồ họa Math 3D */}
        <div className="relative shrink-0 pr-2">
          <svg width="100" height="90" viewBox="0 0 100 90" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="20" width="46" height="58" rx="6" fill="#FFFFFF" stroke="#6f2dbd" strokeWidth="2" />
            <path d="M18 35L28 55L38 42L48 60" stroke="#6f2dbd" strokeWidth="2.5" strokeLinecap="round" />
            {/* Máy tính bỏ túi */}
            <rect x="42" y="32" width="44" height="54" rx="8" fill="#4b1fcb" />
            <rect x="48" y="38" width="32" height="14" rx="3" fill="#6f2dbd" />
            <circle cx="53" cy="60" r="3" fill="#6f2dbd" />
            <circle cx="64" cy="60" r="3" fill="#6f2dbd" />
            <circle cx="75" cy="60" r="3" fill="#4c1979" />
            <circle cx="53" cy="72" r="3" fill="#6f2dbd" />
            <circle cx="64" cy="72" r="3" fill="#6f2dbd" />
            <circle cx="75" cy="72" r="3" fill="#6f2dbd" />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function VerbalCourseIllustration({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative h-44 w-full overflow-hidden rounded-t-[var(--radius-lg)] bg-gradient-to-br from-danger-soft via-accent-soft to-accent-soft p-5",
        className,
      )}
    >
      {/* Badge version góc phải */}
      <span className="absolute right-4 top-4 rounded-full bg-danger px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
        Cập nhật 2026
      </span>

      {/* Brand logo mờ */}
      <div className="flex items-center gap-1 text-xs font-black tracking-tight text-danger/60">
        <span className="grid size-4 place-items-center rounded-full bg-danger text-[10px] text-white">H</span>
        AtlasSAT
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <span className="font-display text-2xl font-black tracking-tight text-danger">
            SAT <span className="text-danger">Verbal</span>
          </span>
          <p className="text-xs font-semibold text-danger/80">Reading & Writing Strategies</p>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-bold text-danger shadow-xs backdrop-blur-xs">
              Vocab in Context
            </span>
            <span className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-bold text-danger shadow-xs backdrop-blur-xs">
              Transitions
            </span>
          </div>
        </div>

        {/* Minh họa sách vở & highlight */}
        <div className="relative shrink-0 pr-2">
          <svg width="100" height="90" viewBox="0 0 100 90" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="14" y="24" width="48" height="60" rx="4" fill="#4c1979" />
            <rect x="22" y="16" width="48" height="64" rx="4" fill="#FFFFFF" stroke="#c7f000" strokeWidth="2" />
            <line x1="30" y1="28" x2="60" y2="28" stroke="#c7f000" strokeWidth="3" strokeLinecap="round" />
            <line x1="30" y1="36" x2="56" y2="36" stroke="#e3f2e9" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="30" y1="44" x2="62" y2="44" stroke="#c7f000" strokeWidth="4" strokeLinecap="round" />
            <line x1="30" y1="52" x2="50" y2="52" stroke="#e3f2e9" strokeWidth="2.5" strokeLinecap="round" />
            {/* Bút dạ quang cam */}
            <rect x="52" y="44" width="12" height="42" rx="3" fill="#4c1979" transform="rotate(-30 52 44)" />
            <path d="M52 44L56 36L62 40L58 48Z" fill="#c7f000" />
          </svg>
        </div>
      </div>
    </div>
  );
}
