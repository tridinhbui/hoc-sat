import { cn } from "@/lib/utils/cn";

/** Nền pastel sinh theo hash tên — cùng người luôn ra cùng màu */
const PASTELS = ["#ede9fa", "#f5fcd1", "#e6f7ec", "#f1eaf8", "#ede8f2", "#ede9fa"];
const INK = ["#4b1fcb", "#4c1979", "#199647", "#6f2dbd", "#4c1979", "#6f2dbd"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({
  name,
  size = 36,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const i = hash(name) % PASTELS.length;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: PASTELS[i],
        color: INK[i],
        fontSize: size * 0.36,
      }}
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}
