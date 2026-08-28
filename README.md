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
| Email | Resend (REST qua `fetch`, gửi nền bằng `waitUntil`) |
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
npm run typecheck        # next typegen && tsc --noEmit
npm run lint             # eslint (gồm rule chặn import DB ngoài repo layer)
npm run audit            # soát mọi action/route đều đi qua guard
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
npx wrangler secret put BETTER_AUTH_SECRET   # chuỗi ngẫu nhiên >= 32 ký tự
npx wrangler secret put BETTER_AUTH_URL      # https://<domain thật>
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put MAIL_FROM            # "HocSAT <no-reply@domain-đã-verify>"
npm run db:migrate:remote
npm run deploy
```

### Email

Gửi qua Resend bằng REST API (không kéo SDK để bundle Worker nhẹ). Email chạy nền bằng
`ctx.waitUntil` — giáo viên bấm "Trả bài" không phải chờ 30 email gửi xong.

**Trước khi gửi mail thật:** verify domain ở Resend (SPF + DKIM). Dùng domain mặc định của
Resend cho mail thật thì gần như chắc chắn vào spam.

Chưa cấu hình `RESEND_API_KEY` thì hệ thống **bỏ qua email trong im lặng** — dev và test không
cần email, và thiếu key không được làm hỏng thao tác nghiệp vụ.

Các mốc gửi email:

| Mốc | Người nhận |
|---|---|
| Admin tạo tài khoản | người vừa được tạo (kèm mật khẩu tạm) |
| Bài tập chuyển từ nháp sang đã giao | cả lớp (chỉ học sinh còn hoạt động) |
| Giáo viên trả bài | học sinh có bài được trả |

### Giới hạn đã biết

**Không có cron.** Worker do OpenNext sinh chỉ có handler `fetch`, không có `scheduled` —
khai báo `triggers` trong `wrangler.jsonc` sẽ là cấu hình chết. Hệ quả:

- **Chốt lượt thi hết giờ** làm theo kiểu lazy, ngay khi có người đọc tới. Không mất tính đúng
  đắn vì `expires_at` đã chặn mọi lần ghi sau giờ.
- **Nhắc deadline trước 24h chưa có.** Cần một Worker phụ chạy cron gọi vào endpoint nội bộ,
  hoặc một lịch ngoài. Cùng hạ tầng với hướng Durable Object đang hoãn.

**Upload giới hạn 25MB** vì file đi qua Worker. File lớn hơn cần presigned URL thẳng lên R2
(cần tạo R2 access key trên dashboard).

> `BETTER_AUTH_URL` **bắt buộc** phải set trên production. Để trống chỉ dành cho dev
> (better-auth sẽ suy origin từ request — production mà để trống là hở origin check).

## Quy tắc bắt buộc khi viết code

D1 **không có row-level security**. Không có hàng rào nào ở tầng DB, nên:

1. Mọi truy vấn dữ liệu lớp học đi qua `src/lib/repo/*`, nhận `AuthContext` / `ClassContext`
   sinh từ `src/lib/auth/guard.ts`.
2. Luật "ai được làm gì" nằm ở **đúng một chỗ**: `src/lib/auth/policy.ts`.
3. ESLint chặn `import ... from "@/db"` ngoài `src/lib/repo`, `src/lib/auth`, `src/db`, `scripts`, `tests`.
4. Thêm guard mới thì phải thêm case vào `tests/permissions.test.ts` cho **cả 4 role + người ngoài lớp**.
5. `npm run audit` soát bằng máy rằng mọi server action và route handler đều gọi guard. Chạy
   trong CI, nên quên guard là PR đỏ ngay chứ không chờ ai đọc code phát hiện.
