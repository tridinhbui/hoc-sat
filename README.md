# HocSAT

LMS luyện thi SAT cho trung tâm. Next.js trên Cloudflare Workers.

- Kế hoạch & kiến trúc: [PLAN.md](./PLAN.md)
- Design system: [DESIGN.md](./DESIGN.md)

## Stack

| Lớp | Công nghệ |
|---|---|
| App | Next.js 16 (App Router) + TypeScript |
| Deploy | Cloudflare Workers qua `@opennextjs/cloudflare` |
| DB | D1 (SQLite) + Drizzle ORM |
| File | R2 · **Cache/session:** KV |
| Auth | better-auth (email + mật khẩu, tài khoản do trung tâm cấp) |
| UI | Tailwind v4 + design tokens riêng |
| Test | Vitest + `@cloudflare/vitest-plugin` (chạy trên D1 thật) |

## Chạy local

```bash
npm install
cp .dev.vars.example .dev.vars   # điền BETTER_AUTH_SECRET
npm run db:migrate:local
npx tsx scripts/seed.ts && npm run db:seed:local
npm run dev
```

### Tài khoản seed (dev)

Mật khẩu chung: `HocSAT@2026`

| Role | Email |
|---|---|
| Admin | `admin@hocsat.vn` |
| Giáo viên | `co.lan@hocsat.vn` |
| TA | `ta.minh@hocsat.vn` |
| Học sinh | `ngoc@hocsat.vn`, `huy@hocsat.vn` |
| Học sinh (test đổi mật khẩu lần đầu) | `khue@hocsat.vn` |

Lớp mẫu: `RWX24A` (Reading & Writing) · `MTH7B2` (Math)

## Lệnh

```bash
npm run dev              # dev server (binding D1/R2/KV chạy local qua miniflare)
npm run typecheck        # tsc --noEmit
npm run lint             # eslint (gồm rule chặn import DB ngoài repo layer)
npm test                 # test phân quyền trên D1 thật
npm run build            # next build
npm run preview          # build + chạy trong Workers runtime
npm run deploy           # build + deploy lên Cloudflare
npm run db:generate      # sinh migration từ src/db/schema.ts
npm run cf-typegen       # sinh lại cloudflare-env.d.ts sau khi sửa wrangler.jsonc
```

## Trước khi deploy lần đầu

```bash
npx wrangler d1 create hocsat-db
npx wrangler r2 bucket create hocsat-files
npx wrangler kv namespace create CACHE
```

Dán `database_id` và KV `id` vào `wrangler.jsonc` (đang là placeholder), rồi:

```bash
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put BETTER_AUTH_URL
npx wrangler secret put RESEND_API_KEY
npm run db:migrate:remote
```

> `BETTER_AUTH_URL` **bắt buộc** phải set trên production. Để trống chỉ dành cho dev
> (better-auth sẽ suy origin từ request — production mà để trống là hở origin check).

## Quy tắc bắt buộc khi viết code

D1 **không có row-level security**. Không có hàng rào nào ở tầng DB, nên:

1. Mọi truy vấn dữ liệu lớp học đi qua `src/lib/repo/*`, nhận `AuthContext` / `ClassContext`
   sinh từ `src/lib/auth/guard.ts`.
2. Luật "ai được làm gì" nằm ở **đúng một chỗ**: `src/lib/auth/policy.ts`.
3. ESLint chặn `import ... from "@/db"` ngoài `src/lib/repo`, `src/lib/auth`, `src/db`, `scripts`, `tests`.
4. Thêm guard mới thì phải thêm case vào `tests/permissions.test.ts` cho **cả 4 role + người ngoài lớp**.
