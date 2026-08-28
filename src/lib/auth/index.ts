import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/db";
import * as schema from "@/db/schema";

/**
 * betterAuth phải dựng theo từng request: trên Workers, `env` (secret + binding)
 * chỉ tồn tại trong request context, không có ở module scope.
 */
export async function getAuth() {
  const { env } = await getCloudflareContext({ async: true });

  return betterAuth({
    database: drizzleAdapter(await getDb(), {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),

    secret: env.BETTER_AUTH_SECRET,
    // Dev: để trống → better-auth tự suy ra từ request (port của `next dev` hay đổi).
    // Production: BẮT BUỘC set đúng origin thật, nếu không origin check sẽ hở.
    baseURL: env.BETTER_AUTH_URL || undefined,

    emailAndPassword: {
      enabled: true,
      // Tài khoản do trung tâm tạo sẵn — không mở đăng ký tự do.
      disableSignUp: true,
      minPasswordLength: 8,
    },

    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "student", input: false },
        phone: { type: "string", required: false, input: false },
        mustChangePassword: { type: "boolean", defaultValue: true, input: false },
        active: { type: "boolean", defaultValue: true, input: false },
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 ngày
      updateAge: 60 * 60 * 24, // gia hạn tối đa 1 lần/ngày
      // Cookie cache tiết kiệm rất nhiều rows read của D1, nhưng dữ liệu user
      // trong cookie sẽ CŨ trong khoảng maxAge. Giữ ngắn để việc khoá tài khoản
      // (active=false) hay đổi role có hiệu lực nhanh. Chỗ nào cần chính xác
      // tức thì thì phải refresh tường minh — xem clearMustChangePassword().
      cookieCache: { enabled: true, maxAge: 60 },
    },

    advanced: {
      database: { generateId: () => crypto.randomUUID() },
    },

    plugins: [nextCookies()],
  });
}

export type Auth = Awaited<ReturnType<typeof getAuth>>;
