import { cn } from "@/lib/utils/cn";

export type CuPose = "wave" | "sleep" | "graduate" | "magnify" | "confused" | "flame";

/**
 * "Cú" — mascot 2D flat của AtlasSAT. Periwinkle + vàng, bo tròn, không viền đen.
 * KHÔNG dùng trong phòng thi lockdown, trang điểm, hay cảnh báo lỗi hệ thống.
 */
export function Cu({
  pose = "wave",
  size = 120,
  className,
}: {
  pose?: CuPose;
  size?: number;
  className?: string;
}) {
  const sleeping = pose === "sleep";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      role="img"
      aria-label="Cú — mascot của AtlasSAT"
      className={cn("shrink-0", className)}
    >
      {/* bóng nền pastel */}
      <ellipse cx="80" cy="142" rx="42" ry="7" fill="#5B6CFF" opacity=".10" />

      {/* chùm lông tai */}
      <path d="M46 44c-6-10-5-19-1-25 6 3 12 10 14 19z" fill="#4A5AEB" />
      <path d="M114 44c6-10 5-19 1-25-6 3-12 10-14 19z" fill="#4A5AEB" />

      {/* thân */}
      <path
        d="M80 26c28 0 46 21 46 50s-18 50-46 50-46-21-46-50 18-50 46-50z"
        fill="#5B6CFF"
      />
      {/* bụng sáng */}
      <path
        d="M80 68c17 0 28 14 28 30s-11 26-28 26-28-10-28-26 11-30 28-30z"
        fill="#E4E8FF"
      />

      {/* cánh */}
      <path d="M36 74c-6 10-5 26 3 36 6-4 9-12 9-22z" fill="#4A5AEB" />
      {pose === "wave" ? (
        <path d="M124 74c9-6 18-4 22 3-5 6-13 9-20 8z" fill="#4A5AEB" />
      ) : (
        <path d="M124 74c6 10 5 26-3 36-6-4-9-12-9-22z" fill="#4A5AEB" />
      )}

      {/* mắt */}
      {sleeping ? (
        <>
          <path d="M56 74c4-5 12-5 16 0" stroke="#0F1B45" strokeWidth="4" strokeLinecap="round" />
          <path d="M88 74c4-5 12-5 16 0" stroke="#0F1B45" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="64" cy="72" r="14" fill="#FFFFFF" />
          <circle cx="96" cy="72" r="14" fill="#FFFFFF" />
          <circle cx={pose === "confused" ? 61 : 66} cy="73" r="6.5" fill="#0F1B45" />
          <circle cx={pose === "confused" ? 93 : 98} cy="73" r="6.5" fill="#0F1B45" />
          <circle cx={pose === "confused" ? 63 : 68} cy="70" r="2.2" fill="#FFFFFF" />
          <circle cx={pose === "confused" ? 95 : 100} cy="70" r="2.2" fill="#FFFFFF" />
        </>
      )}

      {/* mỏ */}
      <path d="M80 84l7 9h-14z" fill="#FFB020" />

      {/* má hồng nhẹ */}
      <ellipse cx="48" cy="88" rx="7" ry="4.5" fill="#FF8A3D" opacity=".25" />
      <ellipse cx="112" cy="88" rx="7" ry="4.5" fill="#FF8A3D" opacity=".25" />

      {/* chân */}
      <path d="M68 126v8M92 126v8" stroke="#FFB020" strokeWidth="5" strokeLinecap="round" />

      {/* ---- phụ kiện theo pose ---- */}
      {pose === "sleep" && (
        <g fill="#7C89AD">
          <text x="116" y="48" fontSize="16" fontWeight="700">z</text>
          <text x="128" y="34" fontSize="20" fontWeight="700">z</text>
        </g>
      )}

      {pose === "graduate" && (
        <>
          <path d="M80 18L44 32l36 14 36-14z" fill="#0F1B45" />
          <path d="M104 40v14c0 5-24 5-24 0" stroke="#0F1B45" strokeWidth="3" fill="none" />
          <circle cx="116" cy="30" r="3.5" fill="#FFB020" />
          <circle cx="34" cy="40" r="4" fill="#FFB020" />
          <circle cx="130" cy="62" r="3" fill="#FF8A3D" />
          <circle cx="26" cy="72" r="3" fill="#22C58B" />
        </>
      )}

      {pose === "magnify" && (
        <g>
          <circle cx="126" cy="98" r="15" stroke="#FFB020" strokeWidth="5" fill="#FFFFFF" fillOpacity=".55" />
          <path d="M137 110l10 11" stroke="#FFB020" strokeWidth="6" strokeLinecap="round" />
        </g>
      )}

      {pose === "confused" && (
        <text x="118" y="46" fontSize="28" fontWeight="800" fill="#FFB020">?</text>
      )}

      {pose === "flame" && (
        <path
          d="M128 96c0-9-6-12-6-19-7 4-11 11-11 19a11 11 0 0022 0z"
          fill="#FF8A3D"
        />
      )}
    </svg>
  );
}
