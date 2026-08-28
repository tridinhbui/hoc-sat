# HocSAT — Plan xây dựng LMS luyện thi SAT

**Stack chốt:** Next.js 15 App Router (TypeScript) → **Cloudflare Workers** qua `@opennextjs/cloudflare`
**Data:** D1 (SQLite) + Drizzle ORM · **File:** R2 · **Cache/session:** KV · **Realtime + phòng thi:** Durable Objects
**Auth:** better-auth (Drizzle adapter → D1) · **Email:** Resend · **Job:** Cron Triggers + Queues
**UI:** Tailwind + shadcn/ui, design system riêng (xem `DESIGN.md`)

---

## 1. Kiến trúc

```
Cloudflare Worker (Next.js qua OpenNext)
├── Server Components / Server Actions   ← đọc-ghi D1 qua Drizzle
├── Route Handlers /api/*                ← upload, exam autosave, webhook
└── Client Components                    ← quiz UI, lockdown, WebSocket

Bindings
├── DB      → D1        toàn bộ dữ liệu quan hệ
├── FILES   → R2        materials/ · submissions/ · questions/
├── KV      → KV        session cache, rate limit, class-code lookup
├── EXAM    → Durable Object  1 DO / 1 lượt thi: timer, autosave, proctor log
├── ROOM    → Durable Object  1 DO / 1 lớp: fanout thông báo + màn giám sát thi
└── MAIL_Q  → Queue     fanout email (1 bài tập → 30 mail) tránh giới hạn subrequest

Cron Triggers
├── 0 * * * *   nhắc deadline còn 24h
└── */5 * * * * đóng exam quá close_at, ép submit attempt treo
```

### ⚠️ Khác biệt lớn nhất so với Postgres/Supabase: **không có RLS**

D1 không có row-level security. Toàn bộ phân quyền phải nằm ở application layer. Đây là rủi ro bảo mật số 1 của dự án — xử lý bằng kỷ luật kiến trúc:

- **Mọi** truy cập dữ liệu lớp học đi qua đúng một module `lib/auth/guard.ts`:
  ```ts
  requireUser()                               // đã đăng nhập
  requireRole('teacher' | 'ta' | 'student')   // role hệ thống
  requireClassRole(classId, ['teacher','ta']) // thành viên lớp + quyền trong lớp
  requireOwnSubmission(submissionId)          // học sinh chỉ chạm bài của mình
  ```
- Cấm gọi `db.select()` trực tiếp trong page/component. Mọi query nằm trong `lib/repo/*.ts`, và mỗi hàm repo **bắt buộc** nhận `ctx` đã qua guard.
- ESLint rule chặn import `db` ngoài thư mục `lib/repo`.
- Bộ test phân quyền chạy trong CI: với mỗi endpoint, thử bằng cả 3 role + user ngoài lớp, assert 403.

### Ghi chú nền tảng D1
- SQLite: **không có** enum / array / jsonb. Dùng `text` + `CHECK(...)`, và JSON lưu dạng `text` (Drizzle `mode:'json'`).
- Tính phí theo **rows read/written**, không theo query → index là bắt buộc, không phải tối ưu về sau. Mọi cột lọc (`class_id`, `assignment_id`, `student_id`, `session_date`) đều phải có index ngay từ migration đầu.
- `db.batch()` chạy như một transaction; không có transaction dài kiểu Postgres → thao tác nhiều bảng phải gói vào một `batch()`.
- Giới hạn dung lượng / rows theo plan: kiểm tra [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) trước khi lên production. Ảnh đề và file nộp **luôn ở R2**, D1 chỉ giữ key.

---

## 2. Database schema (D1 / SQLite)

Timestamp lưu `integer` (unix ms). Enum lưu `text` + CHECK.

### Auth & người dùng
```
users            id, email UNIQUE, name, email_verified, image, created_at, updated_at
accounts         (better-auth) id, user_id, provider_id, password_hash, ...
sessions         (better-auth) id, user_id, token, expires_at, ip, user_agent

profiles         user_id PK → users
                 role TEXT CHECK(role IN ('admin','teacher','ta','student'))
                 phone, must_change_password INTEGER DEFAULT 1
                 active INTEGER DEFAULT 1, created_at
```
> Đã tách sẵn role `admin` ngay từ đầu — thêm sau tốn hơn nhiều.

Admin tạo tài khoản (form đơn lẻ hoặc **import CSV**), sinh mật khẩu tạm → Resend gửi thông tin đăng nhập → ép đổi mật khẩu ở lần đăng nhập đầu (`must_change_password`).

### Lớp học
```
classes          id, name
                 code TEXT UNIQUE (6 ký tự, bỏ ký tự dễ nhầm: 0/O/1/I/l)
                 subject CHECK(subject IN ('rw','math'))   -- chọn TRƯỚC khi tạo lớp
                 teacher_id, schedule_note, archived, created_at
                 INDEX(teacher_id), INDEX(code)

class_members    id, class_id, user_id
                 role CHECK(role IN ('teacher','ta','student'))
                 joined_at, UNIQUE(class_id, user_id)
                 INDEX(class_id), INDEX(user_id)
```
Học sinh join bằng mã lớp (Google Classroom style). TA do giáo viên thêm từ tab Học sinh.

### Nội dung
```
announcements    id, class_id, author_id, content, pinned, created_at  INDEX(class_id, created_at)
materials        id, class_id, author_id, title, description, created_at  INDEX(class_id)
attachments      id, owner_type CHECK(IN ('announcement','material','assignment','submission'))
                 owner_id, r2_key, file_name, mime, size, created_at
                 INDEX(owner_type, owner_id)
```

### Bài tập & nộp bài
```
assignments      id, class_id, author_id, title, description
                 kind CHECK(IN ('file','quiz','mixed'))
                 due_at, points, allow_late, published_at (NULL = draft), created_at
                 INDEX(class_id, due_at)

questions        id, assignment_id, exam_module_id      -- CHECK: đúng 1 trong 2 khác NULL
                 order_index, prompt (markdown), image_r2_key
                 type CHECK(IN ('mcq','grid_in','free_text'))
                 choices TEXT (JSON: [{key:'A',text:'…'}])
                 correct_answer TEXT
                 accepted_answers TEXT (JSON array — grid-in: ["3/4",".75","0.75"])
                 explanation, points, domain, skill_tag
                 INDEX(assignment_id), INDEX(exam_module_id)

submissions      id, assignment_id, student_id
                 status CHECK(IN ('assigned','turned_in','returned'))
                 turned_in_at, returned_at, is_late
                 auto_score, manual_score, final_grade, feedback, graded_by
                 UNIQUE(assignment_id, student_id)  INDEX(student_id)

answers          id, submission_id, attempt_id, question_id
                 response TEXT, is_correct, points_awarded, flagged, answered_at
                 INDEX(submission_id), INDEX(attempt_id), INDEX(question_id)
```

**Auto-chấm:** giáo viên set đáp án ngay lúc tạo câu hỏi. Học sinh bấm *Turn in* → server action chấm `mcq` + `grid_in`, ghi `is_correct` + `auto_score` trong một `db.batch()`. `free_text` để giáo viên chấm tay. `final_grade = auto_score + manual_score`.

**Chuẩn hoá grid-in** (`lib/grading/normalize.ts`): trim, bỏ khoảng trắng, quy phân số → thập phân, so sánh với sai số nhỏ, chấp nhận cả `accepted_answers`. Có unit test riêng — đây là chỗ dễ chấm sai nhất.

### Điểm danh
```
attendance_sessions  id, class_id, session_date, title, created_by  INDEX(class_id, session_date)
attendance_records   id, session_id, student_id
                     status CHECK(IN ('present','absent','late','excused'))
                     note, marked_by, marked_at
                     UNIQUE(session_id, student_id)
```

### Calendar
```
calendar_events  id, class_id, title, description
                 type CHECK(IN ('class','deadline','midterm','final','other'))
                 start_at, end_at, all_day, created_by  INDEX(class_id, start_at)
```
Deadline bài tập và lịch thi **không nhập tay 2 lần** — hàm `getCalendarFeed()` union `calendar_events` + `assignments.due_at` + `exams.open_at`. Chỉ giáo viên ghi; TA và học sinh chỉ đọc.

### Thi & Lockdown
```
exams            id, class_id, title
                 kind CHECK(IN ('midterm','final','practice'))
                 open_at, close_at, lockdown DEFAULT 1
                 violation_limit DEFAULT 3, released (cho xem đáp án), created_by

exam_modules     id, exam_id, order_index, name
                 subject CHECK(IN ('rw','math'))
                 duration_minutes, question_count
                 -- Preset: Math 35 phút / 22 câu · RW 32 phút / 27 câu

exam_attempts    id, exam_id, student_id
                 status CHECK(IN ('not_started','in_progress','submitted','auto_submitted','voided'))
                 started_at, submitted_at, current_module_id, total_score, violation_count
                 UNIQUE(exam_id, student_id)

module_attempts  id, attempt_id, module_id, started_at, expires_at, submitted_at

proctor_events   id, attempt_id, type, occurred_at, meta TEXT(JSON)
                 -- type: blur | visibility_hidden | fullscreen_exit | copy | paste
                 --       contextmenu | devtools | resize | disconnect | multi_tab
                 INDEX(attempt_id, occurred_at)
```

---

## 3. Phòng thi bằng Durable Object

Mỗi lượt thi = một DO instance, id = `exam:{examId}:{studentId}`. Đây là lý do chính chọn Cloudflare-native.

**DO giữ:**
- `expires_at` từng module, tính **hoàn toàn server-side** khi `startModule()` → client chỉ vẽ countdown, không có quyền quyết định thời gian
- Đáp án buffer trong DO SQLite storage → autosave mỗi 10s và mỗi lần đổi câu, **không** đấm vào D1 từng lần (tiết kiệm rows written)
- `alarm()` đặt đúng `expires_at` → hết giờ tự khoá module và chuyển module kế, kể cả khi học sinh đóng máy
- WebSocket (Hibernation API) tới học sinh: đồng bộ thời gian, khoá màn hình khi vi phạm quá ngưỡng
- Ghi `proctor_events` ngay khi nhận, forward sang `ROOM` DO của lớp → màn giám sát của giáo viên thấy realtime
- Khi submit / hết giờ → flush toàn bộ answers + events xuống D1 trong một `batch()`, chấm điểm luôn

**Lợi ích so với REST thuần:** không race condition khi mở 2 tab, không mất bài khi rớt mạng (state ở DO), không tin được client về thời gian, và giáo viên xem được realtime mà không cần polling.

### Lockdown phía client (chống vô ý)
- `requestFullscreen()` khi start; `fullscreenchange` → overlay đỏ + log; vượt `violation_limit` → auto submit
- `visibilitychange`, `blur` → log
- `preventDefault`: `copy`, `paste`, `cut`, `contextmenu`, `selectstart`, `dragstart`
- Chặn phím: `Ctrl/Cmd + C/V/X/P/S/U`, `F12`, `Ctrl+Shift+I/J/C`
- `beforeunload` chặn reload; `BroadcastChannel` phát hiện mở tab thứ 2 cùng đề
- Mất mạng → banner "đang kết nối lại", WebSocket tự reconnect vào đúng DO, timer không reset

> ⚠️ **Nói thẳng với trung tâm:** lockdown trên trình duyệt không chặn được học sinh dùng điện thoại thứ hai hay máy khác. Nó ngăn hành vi vô ý và tạo log để giáo viên đối chiếu. Muốn chống gian lận nghiêm ngặt thì phải thi tập trung tại phòng máy. **Chặn thi trên mobile browser** — lockdown gần như vô hiệu ở đó.

---

## 4. Ma trận phân quyền

| Chức năng | Admin | Giáo viên | TA | Học sinh |
|---|---|---|---|---|
| Tạo tài khoản / CSV import | ✅ | ❌ | ❌ | ❌ |
| Tạo lớp · Cài đặt lớp | ✅ | ✅ | ❌ | ❌ |
| Quản lý roster (HS + TA) | ✅ | ✅ | ❌ | ❌ |
| Đăng thông báo | ✅ | ✅ | ✅ | ❌ |
| Đăng tài liệu | ✅ | ✅ | ✅ | xem |
| Tạo bài tập + set đáp án | ✅ | ✅ | ✅ | ❌ |
| Xem bài nộp | ✅ | ✅ | ✅ | của mình |
| Chấm + feedback + **Return** | ✅ | ✅ | ✅ | ❌ |
| Điểm danh | ✅ | ✅ | ✅ | xem của mình |
| Set lịch calendar | ✅ | ✅ | ❌ | ❌ |
| Xem calendar | ✅ | ✅ | ✅ | ✅ |
| Tạo / mở đề thi | ✅ | ✅ | ❌ | ❌ |
| Màn giám sát + log vi phạm | ✅ | ✅ | xem | ❌ |

TA **không có** tab "Cài đặt lớp" và "Học sinh" — ẩn ở UI **và** chặn ở `requireClassRole`.

---

## 5. Sơ đồ route

```
/login  /change-password  /forgot-password

/dashboard                       → redirect theo role
/admin/users                     tạo tài khoản, CSV import, reset mật khẩu

/teacher
  /                              lớp của tôi + "cần chấm" + bento stats
  /classes/new                   bước 1: chọn RW / Math → bước 2: tên lớp
  /classes/[id]
    /stream                      thông báo
    /assignments                 list + tạo mới
    /assignments/[aid]           bảng nộp bài · chấm · feedback · Return
    /assignments/[aid]/analytics dashboard câu sai
    /materials  /attendance  /people  /settings
    /exams  /exams/[eid]/monitor màn giám sát realtime

/ta
  /                              lớp phụ trách + shortcut "Điểm danh hôm nay" / "Chưa chấm"
  /classes/[id]/{stream|assignments|attendance}     ← đúng 3 tab

/student
  /                              lớp của tôi + việc cần làm + streak/XP
  /join                          nhập mã lớp
  /classes/[id]/{stream|assignments|materials|grades}
  /assignments/[aid]             làm bài / nộp file
  /exams/[eid]                   phòng thi lockdown

/calendar                        chung 3 role, quyền ghi khác nhau
```

### Dashboard câu sai (P3 — giá trị sư phạm cao nhất)
- **Heatmap câu × học sinh**: ô xanh đúng / đỏ sai → nhìn phát biết cả lớp vướng câu nào
- Tỉ lệ đúng từng câu, xếp hạng câu sai nhiều nhất
- Breakdown theo `domain` / `skill_tag` → biết lớp yếu mảng nào (Algebra, Words in Context…)
- Xem theo 1 học sinh: câu sai + đáp án đã chọn + đáp án đúng + giải thích

---

## 6. Lộ trình build (≈11 tuần, 1 dev full-time)

| GĐ | Nội dung | Ước lượng |
|---|---|---|
| **P0 — Nền móng** ✅ | `create-next-app` + `@opennextjs/cloudflare`, wrangler config + bindings, Drizzle + D1 migration đầy đủ + index, seed, **better-auth** (login, đổi mật khẩu, session), **module guard + test phân quyền**, design system + component base (xem `DESIGN.md`), layout theo role | **2 tuần** |
| **P1 — Lớp học** ✅ | Tạo lớp (chọn RW/Math trước), sinh mã, join bằng mã, roster, thêm TA, thông báo, tài liệu + upload R2 (presigned URL) | 1 tuần |
| **P2 — Bài tập & chấm** ✅ | Tạo bài tập (draft/publish, due, đính kèm), HS nộp file, bảng theo dõi nộp, chấm + feedback + **Return**, HS xem điểm | 1.5 tuần |
| **P3 — Quiz & auto-chấm** | Trình soạn câu hỏi (MCQ / grid-in / tự luận, paste ảnh → R2), **import CSV/JSON đề**, UI làm bài, engine auto-chấm + normalize grid-in, **dashboard câu sai** | 2 tuần |
| **P4 — Điểm danh & TA** | Điểm danh theo buổi/ngày, sửa lịch sử, thống kê chuyên cần, dashboard TA + shortcut, khoá đúng 3 tab | 1 tuần |
| **P5 — Calendar** | View tháng/tuần, feed hợp nhất, giáo viên CRUD, TA/HS read-only, lọc theo lớp | 0.5 tuần |
| **P6 — Thi & Lockdown** | Tạo đề nhiều module (preset Math 35/22, RW 32/27), **Durable Object phòng thi** (timer, autosave, alarm, WebSocket), lockdown client, proctor log, màn giám sát realtime, auto-submit qua cron, bảng điểm thi | **2.5 tuần** |
| **P7 — Email & hoàn thiện** | Resend + React Email qua Queue: tài khoản mới, bài tập mới, bài được trả, nhắc deadline (cron); thông báo in-app qua `ROOM` DO; responsive; audit lại guard; custom domain + deploy production | 1 tuần |

**Chạy song song được:** P5 độc lập, xen kẽ khi chờ review P4.

---

## 7. Rủi ro & việc phải chốt sớm

1. **Không có RLS** — rủi ro số 1. Bắt buộc làm module guard + test phân quyền ngay P0, không để tới cuối.
2. **OpenNext là legacy path** — Cloudflare đang đẩy sang `vinext`. OpenNext vẫn GA và chạy production tốt, nhưng cần pin version, theo dõi CVE (đã có 2 vụ: SSRF `/_next/image`, React DoS) và cập nhật đều.
3. **Nhập đề SAT hàng loạt** — gõ tay 27 câu/module rất tốn công. Import CSV/JSON phải nằm trong P3, không để sau.
4. **Ảnh trong đề** (biểu đồ Math, đoạn văn RW) — editor phải hỗ trợ paste ảnh trực tiếp lên R2.
5. **D1 tính tiền theo rows read** — thiếu index là hoá đơn tăng, không chỉ chậm. `EXPLAIN QUERY PLAN` cho mọi query trên trang danh sách.
6. **Múi giờ** — lưu unix ms UTC, hiển thị `Asia/Ho_Chi_Minh`. Đặc biệt cẩn thận với `attendance.session_date` và `due_at`.
7. **Email vào spam** — verify domain ở Resend (SPF/DKIM) trước khi gửi mail thật.
8. **Backup D1** — bật Time Travel và có script export định kỳ. Dữ liệu điểm + bài thi không được mất.
9. **Giới hạn Worker** (CPU time, subrequest, kích thước request) — file lớn phải upload **thẳng lên R2 bằng presigned URL**, không đi qua Worker.

---

## 8. Trạng thái

### P0 — Nền móng ✅ xong

Đã chạy được: đăng nhập → ép đổi mật khẩu lần đầu → dashboard đúng theo role, với data seed thật.
Gate xanh: `typecheck` · `lint` · `test` (9/9 phân quyền trên D1 thật) · `next build` · `opennextjs-cloudflare build`.

| Hạng mục | Nơi |
|---|---|
| Scaffold + bindings D1/R2/KV | `wrangler.jsonc`, `open-next.config.ts` |
| Schema 21 bảng + 8 CHECK + index | `src/db/schema.ts`, `drizzle/0000_init.sql` |
| Auth (better-auth, không cho tự đăng ký) | `src/lib/auth/index.ts` |
| **Luật phân quyền** (thuần, test được) | `src/lib/auth/policy.ts` |
| Guard cho Next (session + redirect) | `src/lib/auth/guard.ts` |
| Repo layer | `src/lib/repo/*` |
| ESLint chặn import DB ngoài repo | `eslint.config.mjs` |
| Test phân quyền trên D1 thật | `tests/permissions.test.ts` |
| Design system + mascot | `src/app/globals.css`, `src/components/*` |
| Seed dev | `scripts/seed.ts` |

### Khác với plan ban đầu — và lý do

1. **Next 16.3.3 thay vì 15.** `@opennextjs/cloudflare@1.20.4` khai báo peer `next: >=15.5.24 <16 || >=16.3.3`.
   Dùng bản latest nằm trong khoảng hỗ trợ thay vì đu bản 15 sắp cũ.
2. **Bỏ bảng `profiles`, gộp vào `user`.** Tách `profiles` là di sản của Supabase (ở đó `auth.users` do
   Supabase quản, không đụng được). Với better-auth mình sở hữu bảng `user`, gộp lại thì mỗi request
   bớt một join — và D1 tính tiền theo rows read.
3. **Có sẵn role `admin` từ đầu** thay vì gộp vào giáo viên. Rủi ro #6 trong plan nói thêm sau sẽ đắt hơn nhiều.
4. **`account.issuer`** là cột bắt buộc của better-auth ≥ 1.7 (`local:credential`). Thiếu nó thì sign-in
   trả 401 mà không có thông báo lỗi nào rõ ràng — mất khá lâu mới truy ra.
5. **Tách `policy.ts` khỏi `guard.ts`.** Guard dính `next/headers` + `server-only` nên không import được
   vào test runner. Luật phân quyền giờ nằm trong module thuần, test chạy trên D1 thật của miniflare.
6. **`session.cookieCache` giảm còn 60s.** Cache này tiết kiệm rất nhiều rows read, nhưng dữ liệu user
   trong cookie sẽ cũ trong khoảng maxAge. Với 5 phút thì khoá tài khoản (`active=false`) giữa giờ thi
   sẽ không có hiệu lực ngay. Chỗ cần chính xác tức thì phải refresh tường minh —
   xem `clearMustChangePassword()`.

### Nợ kỹ thuật đã biết

- `npm audit`: 4 cảnh báo moderate từ `esbuild` cũ, đi kèm `drizzle-kit` (dev-only, không vào bundle
  production). Hạ `drizzle-kit` xuống 0.18 để dứt điểm thì mất tính năng — chờ drizzle-kit cập nhật.
- `wrangler.jsonc` còn placeholder cho `database_id` và KV `id` — điền sau khi tạo resource thật.
- Upload đi qua Worker nên chặn ở 25MB. File lớn hơn (đề scan nhiều trang) cần presigned URL
  thẳng lên R2 — phải làm trước khi học sinh nộp bài chụp ảnh ở P2.
- Chưa dọn file mồ côi trong R2 khi xoá lớp. Cần một cron quét theo prefix `class/{id}/`.

### P1 — Lớp học ✅ xong

Đã chạy được: tạo lớp (chọn môn trước) → sinh mã → giáo viên đăng thông báo và tài liệu →
học sinh vào lớp bằng mã và tải được file → TA thấy đúng 3 tab, bị chặn khỏi roster.

| Hạng mục | Nơi |
|---|---|
| Wizard tạo lớp (chọn RW/Math trước) | `src/app/(app)/teacher/classes/new/wizard.tsx` |
| Vào lớp bằng mã | `src/app/(app)/student/join/` |
| Roster + thêm/gỡ thành viên (teacher-only) | `src/app/(app)/teacher/classes/[id]/people/` |
| Cài đặt lớp + đổi mã lớp | `src/app/(app)/teacher/classes/[id]/settings/` |
| Thông báo (đăng, ghim, xoá) | `src/lib/repo/announcements.ts` |
| Tài liệu + upload R2 | `src/lib/repo/materials.ts`, `src/lib/storage/r2.ts` |
| Upload / download có kiểm quyền | `src/app/api/classes/[classId]/upload/`, `src/app/api/attachments/[id]/` |
| Test luật nội dung (14 case) | `tests/content-permissions.test.ts` |
| CI | `.github/workflows/ci.yml` |

**Quyết định đáng ghi lại:**

1. **File không đi qua server action.** Server action có giới hạn body nhỏ, nên upload đi qua
   route handler riêng, trả về mô tả file, form chỉ gửi lại `r2Key`. Đổi lại phải kiểm rằng
   `r2Key` thuộc đúng lớp đang thao tác — nếu không, ai cũng gắn được file lớp khác vào lớp mình.
   Đã có test cho đúng trường hợp này.
2. **Bucket R2 không public.** Mọi đường tải đi qua `/api/attachments/[id]`, quyền kiểm lại theo
   `classId` nhúng trong key. Response ép `Content-Disposition: attachment` + CSP sandbox để
   file HTML/SVG người dùng up không chạy script trên origin của app.
3. **Xoá D1 trước, xoá R2 sau.** Ngược lại sẽ có bản ghi trỏ vào file không tồn tại; theo thứ tự này
   thì tệ nhất chỉ còn file mồ côi trong bucket.
4. **Học sinh không thấy mã lớp.** Chỉ giáo viên và TA cần đọc mã cho người mới.
5. **TA không gán được cho tài khoản học sinh** — vai trò trong lớp không được vượt vai trò hệ thống.

### P2 — Bài tập & chấm ✅ xong

Đã chạy trọn vòng: giáo viên giao bài có hạn nộp → học sinh thấy ở "Việc cần làm" và nộp file →
giáo viên chấm 18/20 kèm nhận xét rồi bấm trả → học sinh thấy điểm và nhận xét ở tab Điểm.

| Hạng mục | Nơi |
|---|---|
| Repo bài tập, nộp bài, chấm, trả | `src/lib/repo/assignments.ts` |
| Giao bài (nháp / giao ngay, hạn nộp, đính kèm) | `src/components/class/assignment-form.tsx` |
| Bảng theo dõi + chấm + trả bài | `src/components/class/submission-table.tsx` |
| Học sinh nộp / nộp lại / huỷ nộp | `src/components/class/submit-panel.tsx` |
| Bảng điểm học sinh | `src/app/(app)/student/classes/[id]/grades/` |
| Dashboard nối số thật (chưa chấm, sắp đến hạn, việc cần làm) | 3 trang dashboard |
| Test (16 case) | `tests/assignment-permissions.test.ts` |

**Quyết định đáng ghi lại:**

1. **Bài nháp là ranh giới bảo mật, không phải chuyện hiển thị.** `published_at IS NULL` thì học sinh
   không mở được dù biết id — lọc ngay trong repo chứ không ẩn ở UI.
2. **Điểm chỉ lộ ra khi bấm Trả bài.** Giáo viên chấm xong vẫn giữ kín cho tới lúc trả, nên có thể
   chấm cả lớp rồi trả một lượt. `listAssignments` trả `myGrade: null` khi chưa `returned`.
3. **Bảng theo dõi bắt đầu từ roster, không từ bảng submissions.** Học sinh chưa nộp thì chưa có dòng
   nào, mà giáo viên cần thấy đủ cả lớp — nên LEFT JOIN từ `class_members`.
4. **Đã có người nộp thì không rút bài về nháp.** Rút về sẽ làm học sinh mất chỗ xem bài đã nộp.
5. **`kind` của upload chuyển sang query param.** Cần biết loại file để chọn guard, mà kiểm quyền phải
   xong TRƯỚC khi bỏ công parse một body 25MB.
6. **Luật "quá hạn" tính ở repo, không ở component.** Rule `react-hooks/purity` bắt đúng: render phải
   thuần, và luật nghiệp vụ vốn không thuộc về tầng hiển thị.

### Tiếp theo — P3: Quiz & auto-chấm

Trình soạn câu hỏi (MCQ / grid-in / tự luận), import CSV/JSON, engine auto-chấm, dashboard câu sai.

Design chi tiết: xem `DESIGN.md`.
