import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Client D1 cho request hiện tại.
 *
 * KHÔNG import hàm này ngoài `src/lib/repo/**` và `src/lib/auth/**`.
 * Mọi truy vấn phải đi qua repo đã kiểm tra quyền — D1 không có RLS,
 * nên đây là hàng rào duy nhất. Xem PLAN.md §1.
 */
export async function getDb(): Promise<Db> {
  // async mode: trên Workers, context chỉ có trong request — gọi sync sẽ vỡ lúc build.
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema, logger: false });
}

export { schema };
