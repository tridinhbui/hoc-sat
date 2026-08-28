import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      "node_modules/**",
      "drizzle/**",
      "cloudflare-env.d.ts",
    ],
  },
  {
    // HÀNG RÀO: D1 không có RLS. Truy cập DB trực tiếp từ page/component/server action
    // là cách chắc chắn nhất để lộ dữ liệu lớp khác. Chỉ repo và auth được chạm vào db.
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/db", "@/db/*", "drizzle-orm/d1"],
              message:
                "Không import DB trực tiếp. Mọi truy vấn phải đi qua src/lib/repo/* với AuthContext đã qua guard (xem PLAN.md §1).",
            },
          ],
        },
      ],
    },
  },
  {
    // Nơi DUY NHẤT được phép chạm vào db.
    files: [
      "src/lib/repo/**/*.ts",
      "src/lib/auth/**/*.ts",
      "src/db/**/*.ts",
      "scripts/**/*.ts",
      "tests/**/*.ts",
    ],
    rules: { "no-restricted-imports": "off" },
  },
];

export default config;
