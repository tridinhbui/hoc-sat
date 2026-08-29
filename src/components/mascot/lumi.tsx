import { cn } from "@/lib/utils/cn";

export type LumiPose = "wave" | "study" | "gift" | "pencil" | "fire" | "cheer";

/**
 * Linh vật "Lumi" phong cách Lumist.ai — chú cáo cam đáng yêu,
 * tai vểnh, má hồng, mắt to tròn, thân thiện với học sinh.
 */
export function Lumi({
  pose = "wave",
  size = 100,
  className,
}: {
  pose?: LumiPose;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Lumi — linh vật HocSAT phong cách Lumist"
      className={cn("shrink-0 drop-shadow-sm", className)}
    >
      {/* Vòng hào quang/bóng nền nhẹ */}
      <circle cx="60" cy="62" r="46" fill="#FFF7ED" />

      {/* Tai trái */}
      <path
        d="M34 46L24 16C24 16 38 20 46 32L34 46Z"
        fill="#F97316"
      />
      <path
        d="M32 40L27 22C27 22 36 25 41 33L32 40Z"
        fill="#FFEDD5"
      />

      {/* Tai phải */}
      <path
        d="M86 46L96 16C96 16 82 20 74 32L86 46Z"
        fill="#F97316"
      />
      <path
        d="M88 40L93 22C93 22 84 25 79 33L88 40Z"
        fill="#FFEDD5"
      />

      {/* Đầu & Mặt */}
      <path
        d="M60 28C40 28 26 44 26 62C26 80 40 94 60 94C80 94 94 80 94 62C94 44 80 28 60 28Z"
        fill="#FB923C"
      />
      {/* Má phúng phính màu trắng hai bên */}
      <path
        d="M26 64C26 78 38 90 52 92C44 88 38 78 38 68C38 62 40 56 44 50C32 54 26 60 26 64Z"
        fill="#FFFFFF"
      />
      <path
        d="M94 64C94 78 82 90 68 92C76 88 82 78 82 68C82 62 80 56 76 50C88 54 94 60 94 64Z"
        fill="#FFFFFF"
      />

      {/* Mảng trắng trước ngực / cằm */}
      <path
        d="M48 84C52 89 60 92 60 92C60 92 68 89 72 84C66 87 54 87 48 84Z"
        fill="#FFFFFF"
      />

      {/* Mắt to tròn long lanh */}
      <ellipse cx="44" cy="58" rx="6.5" ry="8" fill="#1E293B" />
      <circle cx="42" cy="55" r="2.8" fill="#FFFFFF" />
      <circle cx="46.5" cy="61" r="1.4" fill="#FFFFFF" />

      <ellipse cx="76" cy="58" rx="6.5" ry="8" fill="#1E293B" />
      <circle cx="74" cy="55" r="2.8" fill="#FFFFFF" />
      <circle cx="78.5" cy="61" r="1.4" fill="#FFFFFF" />

      {/* Mũi đen nhỏ */}
      <ellipse cx="60" cy="66" rx="3.5" ry="2.5" fill="#0F172A" />

      {/* Má hồng hào */}
      <ellipse cx="36" cy="68" rx="4.5" ry="3" fill="#F43F5E" opacity="0.35" />
      <ellipse cx="84" cy="68" rx="4.5" ry="3" fill="#F43F5E" opacity="0.35" />

      {/* Miệng cười xinh xắn */}
      <path
        d="M55 71C57 73 59 74 60 74C61 74 63 73 65 71"
        stroke="#0F172A"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Chi tiết theo từng Pose */}
      {pose === "wave" && (
        <g>
          {/* Tay vẫy chào */}
          <path
            d="M92 70C98 66 104 62 108 55C110 52 108 48 104 49C99 50 94 56 90 62"
            fill="#FB923C"
            stroke="#EA580C"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="106" cy="52" r="3.5" fill="#FFFFFF" />
        </g>
      )}

      {pose === "study" && (
        <g>
          {/* Mũ cử nhân nhỏ trên đầu */}
          <path d="M44 26L60 20L76 26L60 32L44 26Z" fill="#2563EB" />
          <path d="M50 28V36C50 39 60 41 60 41C60 41 70 39 70 36V28" fill="#1D4ED8" />
          <path d="M72 26V35" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="72" cy="36" r="1.5" fill="#F59E0B" />
        </g>
      )}

      {pose === "gift" && (
        <g>
          {/* Hộp quà xinh trước ngực */}
          <rect x="46" y="82" width="28" height="24" rx="4" fill="#3B82F6" />
          <rect x="43" y="78" width="34" height="6" rx="2" fill="#60A5FA" />
          <line x1="60" y1="78" x2="60" y2="106" stroke="#FBBF24" strokeWidth="4" />
          <path d="M55 76C53 72 56 69 60 74C64 69 67 72 65 76Z" fill="#F59E0B" />
        </g>
      )}

      {pose === "fire" && (
        <g>
          {/* Ngọn lửa streak trên đầu */}
          <path
            d="M58 8C54 14 59 18 57 22C63 21 66 17 64 12C63 10 61 8 58 8Z"
            fill="#EF4444"
          />
          <path
            d="M59 13C57 16 60 18 59 20C62 19 63 17 62 15Z"
            fill="#FBBF24"
          />
        </g>
      )}
    </svg>
  );
}

/**
 * Minh họa 3D Mock Test Clipboard phong cách Lumist (ảnh 2)
 */
export function MockTestIllustration({ size = 180, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("drop-shadow-lg", className)}
    >
      {/* Vòng nền tỏa sáng nhẹ */}
      <circle cx="80" cy="80" r="70" fill="#EFF6FF" />

      {/* Bảng Clipboard màu xanh blue dịu góc nghiêng */}
      <rect
        x="38"
        y="30"
        width="84"
        height="104"
        rx="16"
        fill="#3B82F6"
        transform="rotate(-4 38 30)"
      />
      <rect
        x="42"
        y="34"
        width="76"
        height="96"
        rx="12"
        fill="#2563EB"
        transform="rotate(-4 42 34)"
      />

      {/* Giấy thi trắng bên trong */}
      <rect
        x="46"
        y="38"
        width="68"
        height="88"
        rx="8"
        fill="#FFFFFF"
        transform="rotate(-4 46 38)"
      />

      {/* Kẹp kim loại đầu bảng */}
      <rect
        x="66"
        y="24"
        width="28"
        height="14"
        rx="4"
        fill="#94A3B8"
        transform="rotate(-4 66 24)"
      />
      <rect
        x="72"
        y="21"
        width="16"
        height="8"
        rx="3"
        fill="#CBD5E1"
        transform="rotate(-4 72 21)"
      />

      {/* Hàng câu hỏi & ô tích trắc nghiệm vàng/cam */}
      <g transform="rotate(-4 54 48)">
        {/* Câu 1 */}
        <rect x="54" y="48" width="30" height="4" rx="2" fill="#CBD5E1" />
        <circle cx="92" cy="50" r="4" fill="#E2E8F0" />
        <circle cx="103" cy="50" r="4" fill="#F59E0B" />

        {/* Câu 2 */}
        <rect x="54" y="60" width="36" height="4" rx="2" fill="#CBD5E1" />
        <circle cx="92" cy="62" r="4" fill="#F59E0B" />
        <circle cx="103" cy="62" r="4" fill="#E2E8F0" />

        {/* Câu 3 */}
        <rect x="54" y="72" width="28" height="4" rx="2" fill="#CBD5E1" />
        <circle cx="92" cy="74" r="4" fill="#E2E8F0" />
        <circle cx="103" cy="74" r="4" fill="#F59E0B" />

        {/* Câu 4 */}
        <rect x="54" y="84" width="40" height="4" rx="2" fill="#CBD5E1" />
        <circle cx="92" cy="86" r="4" fill="#F59E0B" />
        <circle cx="103" cy="86" r="4" fill="#E2E8F0" />
      </g>

      {/* Bút chì 3D màu vàng cam hướng vào bài thi */}
      <g transform="rotate(35 95 90)">
        <rect x="90" y="60" width="12" height="45" rx="3" fill="#F59E0B" />
        <rect x="90" y="60" width="4" height="45" rx="1" fill="#FBBF24" />
        <path d="M90 105L96 117L102 105Z" fill="#FDE68A" />
        <path d="M94 113L96 117L98 113Z" fill="#1E293B" />
        <rect x="90" y="54" width="12" height="7" rx="2" fill="#F43F5E" />
        <rect x="90" y="60" width="12" height="3" fill="#E2E8F0" />
      </g>

      {/* Đồng hồ bấm giờ tròn phong cách Digital SAT */}
      <g transform="translate(108, 92)">
        <circle cx="16" cy="16" r="16" fill="#38BDF8" />
        <circle cx="16" cy="16" r="13" fill="#FFFFFF" />
        <path d="M16 8V16L21 16" stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="14" y="0" width="4" height="4" rx="1" fill="#0284C7" />
      </g>

      {/* Những ngôi sao lấp lánh */}
      <path d="M30 42L32 46L36 48L32 50L30 54L28 50L24 48L28 46Z" fill="#FBBF24" />
      <path d="M136 40L137.5 43L140 44L137.5 45L136 48L134.5 45L132 44L134.5 43Z" fill="#FBBF24" />
    </svg>
  );
}

/**
 * Huy hiệu League khiên 3D phong cách Lumist Bronze/Silver/Gold
 */
export function LeagueShield({ tier = "bronze", size = 64 }: { tier?: "bronze" | "silver" | "gold"; size?: number }) {
  const colors = {
    bronze: { primary: "#D97706", light: "#FDE68A", base: "#B45309", bg: "#FEF3C7" },
    silver: { primary: "#64748B", light: "#F1F5F9", base: "#475569", bg: "#F8FAFC" },
    gold: { primary: "#F59E0B", light: "#FEF08A", base: "#D97706", bg: "#FEF9C3" },
  }[tier];

  return (
    <svg width={size} height={size} viewBox="0 0 64 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M32 2L58 12V36C58 54 44 68 32 72C20 68 6 54 6 36V12L32 2Z"
        fill={colors.base}
      />
      <path
        d="M32 6L54 15V36C54 51 42 63 32 67C22 63 10 51 10 36V15L32 6Z"
        fill={colors.primary}
      />
      <path
        d="M32 10L50 18V36C50 48 40 58 32 62C24 58 14 48 14 36V18L32 10Z"
        fill={colors.light}
        opacity="0.85"
      />
      <path
        d="M32 22L36 30L44 32L38 38L40 46L32 42L24 46L26 38L20 32L28 30L32 22Z"
        fill={colors.primary}
      />
    </svg>
  );
}
