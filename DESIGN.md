# HocSAT — Design System

**Công thức:** Modern SaaS ＋ Soft UI ＋ Bento Grid ＋ Pastel Minimalism ＋ Playful Illustration ＋ Gamification ＋ AI Product Aesthetic

→ *premium nhưng thân thiện, công nghệ nhưng không lạnh, học tập nhưng giống chơi game.*

Tham chiếu: Lumist, Duolingo, Linear, Framer, Arc, Cash App.

---

## 1. Nguyên tắc

1. **Friendly trước, academic sau.** Không dùng bảng biểu khô, không xám xịt. Mọi khối nội dung là một card bo tròn có hơi thở.
2. **Whitespace là tính năng.** Thà ít thông tin trên màn hình còn hơn nhồi.
3. **Màu có nghĩa.** Periwinkle = hành động/thương hiệu. Vàng-cam = thành tựu, streak, phần thưởng. Đỏ chỉ dành cho sai/nguy hiểm. Không tô màu trang trí vô nghĩa.
4. **Mascot xuất hiện đúng lúc:** empty state, hoàn thành bài, đạt streak, lỗi. **Không** xuất hiện trong phòng thi.
5. **Ngoại lệ nghiêm túc:** phòng thi lockdown, trang điểm số, và mọi thông báo lỗi dùng tone trung tính, bỏ mascot và microcopy vui. Đang thi mà thấy mascot nhảy múa là phản cảm.

---

## 2. Color tokens

```css
:root {
  /* Nền */
  --bg:            #F2F6FF;   /* very light blue — nền toàn trang */
  --surface:       #FFFFFF;   /* card */
  --surface-sunken: #EDF2FF;  /* input, khu vực lõm */

  /* Chữ */
  --text:          #0F1B45;   /* navy đậm — heading, bold */
  --text-body:     #3B4A72;
  --text-muted:    #7C89AD;

  /* Brand — periwinkle */
  --primary:       #5B6CFF;
  --primary-hover: #4A5AEB;
  --primary-soft:  #E4E8FF;   /* nền badge/chip */
  --primary-ring:  #5B6CFF33;

  /* Accent — gamification */
  --accent:        #FFB020;   /* vàng: XP, streak, sao */
  --accent-warm:   #FF8A3D;   /* cam: milestone, lửa streak */
  --accent-soft:   #FFF4DC;

  /* Trạng thái */
  --success:       #22C58B;  --success-soft: #DDF7ED;
  --danger:        #F0526B;  --danger-soft:  #FFE4E8;
  --info:          #4CC3F0;  --info-soft:    #E0F6FE;

  /* Đường nét */
  --border:        #E2E8F8;
  --border-strong: #CBD5F0;

  /* Bóng — soft diffuse, ám xanh chứ không đen */
  --shadow-sm: 0 1px 2px rgba(15,27,69,.04);
  --shadow:    0 4px 16px rgba(60,80,180,.07);
  --shadow-md: 0 8px 28px rgba(60,80,180,.10);
  --shadow-lg: 0 16px 48px rgba(60,80,180,.13);

  /* Bo góc */
  --r-sm: 10px;  --r-md: 14px;  --r-lg: 20px;  --r-xl: 28px;  --r-pill: 999px;
}
```

**Dark mode:** không làm ở MVP. Nếu làm sau, đảo `--bg` sang `#0C1230`, giữ nguyên hue periwinkle, giảm saturation accent ~15%.

---

## 3. Typography

| Vai trò | Font | Size / Weight |
|---|---|---|
| Display (hero, số liệu lớn) | **Plus Jakarta Sans** 800 | 40–56px, tracking `-0.02em` |
| Heading | Plus Jakarta Sans 700 | H1 32 · H2 24 · H3 19 |
| Body | **Inter** 400/500 | 15–16px, line-height 1.6 |
| Label / caption | Inter 600 | 12–13px, uppercase tracking `0.04em` cho label |
| Số (điểm, timer, XP) | Inter **tabular-nums** 700 | không nhảy layout khi đếm ngược |

Cả 2 font đều có trên Google Fonts. Heading luôn `var(--text)` navy đậm, không dùng xám cho heading.

---

## 4. Component spec

| Component | Quy cách |
|---|---|
| **Card** | `border-radius: var(--r-lg)`, `background: var(--surface)`, `border: 1px solid var(--border)`, `box-shadow: var(--shadow)`, padding 20–28px |
| **Button primary** | pill, nền `--primary`, chữ trắng 600, `h-44px`, `px-24`, hover nâng `translateY(-1px)` + `--shadow-md` |
| **Button secondary** | pill, nền trắng, `border: 1px solid var(--border-strong)`, chữ `--text` |
| **Button ghost** | pill, không nền, hover `--primary-soft` |
| **Chip / Badge** | pill nhỏ, nền `*-soft`, chữ màu tương ứng, 12px/600. Ví dụ: `Math` `RW` `Đã nộp` `Trễ hạn` |
| **Input** | `--r-md`, nền `--surface-sunken`, focus: nền trắng + `ring 3px var(--primary-ring)` |
| **Avatar** | tròn, ring trắng 2px, fallback = initials trên nền pastel sinh theo hash tên |
| **Progress ring** | dùng cho tiến độ bài/module — stroke 8px, gradient `--primary → --info` |
| **Streak flame** | icon lửa `--accent-warm` + số ngày tabular |
| **Empty state** | mascot + 1 dòng microcopy vui + 1 nút primary. Không bao giờ để trống trơn |

Base: shadcn/ui, nhưng **override token** — không để lộ default shadcn (radius 6px, xám neutral) ra production.

---

## 5. Bento grid dashboard

Dashboard mỗi role là lưới bento 12 cột, các ô kích thước khác nhau, gap 20px.

**Học sinh**
```
┌────────────────────────┬──────────┬──────────┐
│  Việc cần làm (6)      │ Streak   │ XP tuần  │  ← ô nhỏ vàng/cam
├────────────────────────┼──────────┴──────────┤
│  Lớp của tôi (6)       │  Điểm gần đây (6)   │
├────────────────────────┴─────────────────────┤
│  Lịch tuần này (12)                          │
└──────────────────────────────────────────────┘
```

**Giáo viên**
```
┌───────────┬───────────┬───────────┬──────────┐
│ Lớp (3)   │ Chưa chấm │ Sắp đến   │ HS hoạt  │  ← 4 stat tile
│           │ (3)       │ hạn (3)   │ động (3) │
├───────────┴───────────┼───────────┴──────────┤
│  Lớp của tôi (7)      │  Cần chấm gấp (5)    │
├───────────────────────┴──────────────────────┤
│  Câu sai nhiều nhất tuần này (12) — heatmap  │
└──────────────────────────────────────────────┘
```

**TA** — gọn hơn, mỗi lớp là một card có sẵn 2 nút pill: `Điểm danh hôm nay` (primary) và `Chưa chấm · 12` (secondary + badge số).

Mobile: bento sập thành 1 cột, giữ nguyên thứ tự ưu tiên trên.

---

## 6. Mascot

Một nhân vật duy nhất — **con cú tên "Cú"**, phong cách 2D flat, nét bo tròn, 2 màu chính periwinkle + vàng, không viền đen. Bộ pose tối thiểu:

| Pose | Dùng ở |
|---|---|
| Vẫy tay | trang login, onboarding |
| Ngủ | empty state ("Chưa có bài tập nào — Cú đang ngủ 💤") |
| Đội mũ tốt nghiệp + confetti | nộp bài xong, hoàn thành module |
| Cầm kính lúp | không tìm thấy kết quả / lớp không tồn tại |
| Gãi đầu | trang lỗi 404 / 500 |
| Cầm đuốc lửa | đạt streak mới |

Lưu dạng SVG inline trong `components/mascot/`, tô màu bằng `currentColor` + CSS variable để đổi theme không phải xuất lại file.

---

## 7. Gamification

- **Streak**: số ngày liên tiếp có hoạt động (nộp bài / làm quiz / điểm danh có mặt). Hiện ở header học sinh.
- **XP**: mỗi bài nộp đúng hạn +10, mỗi câu đúng +1, hoàn thành đề thi +50. Thanh XP tuần trên dashboard.
- **Huy hiệu**: `Nộp đúng hạn 10 lần`, `Không nghỉ buổi nào tháng này`, `Đúng 100% một module`, `Streak 7/30 ngày`.
- **Confetti** khi Turn in thành công và khi lên huy hiệu (`canvas-confetti`, 1.2s, tôn trọng `prefers-reduced-motion`).
- **Không có bảng xếp hạng công khai** giữa học sinh — dễ phản tác dụng và nhạy cảm với phụ huynh. Chỉ so với chính mình tuần trước.

---

## 8. Motion

- Chuyển trang / mở card: `200ms cubic-bezier(.22,1,.36,1)`, fade + `translateY(6px)`
- Hover nút: `120ms`, nâng 1px
- Progress ring / thanh XP: `600ms ease-out`
- Confetti: chỉ ở khoảnh khắc thành tựu, không dùng cho thao tác thường
- Tôn trọng `prefers-reduced-motion: reduce` → tắt hết transform, giữ opacity

---

## 9. Microcopy

Tone: thân thiện, xưng "bạn", ngắn, có emoji tiết chế (tối đa 1/câu).

| Chỗ | Viết |
|---|---|
| Empty bài tập | "Chưa có bài nào. Cú đang ngủ 💤" |
| Nộp bài xong | "Đã nộp! Ngon lành 🎉" |
| Sắp hết hạn | "Còn 3 giờ nữa thôi nha" |
| Join sai mã | "Mã này không đúng rồi. Kiểm tra lại giúp mình nhé" |
| Streak mới | "7 ngày liên tiếp! Giữ lửa nha 🔥" |

**Ngoại lệ — tone trung tính, không emoji, không đùa:**
- Toàn bộ phòng thi lockdown: *"Bạn đã thoát toàn màn hình. Lần vi phạm 1/3."*
- Trang điểm và feedback của giáo viên
- Cảnh báo mất dữ liệu, hết giờ, lỗi hệ thống

---

## 10. Accessibility

- Contrast tối thiểu 4.5:1 cho body text. **Kiểm tra kỹ `--accent` `#FFB020` trên nền trắng — không đạt**, chỉ dùng làm nền/icon, chữ trên nền vàng phải là navy `--text`.
- Focus ring `3px var(--primary-ring)` nhìn thấy rõ trên mọi control, không `outline: none` trần.
- Không dùng riêng màu để truyền đạt đúng/sai — heatmap câu sai phải có cả icon ✓/✗ cho người mù màu.
- Timer phòng thi có `aria-live="polite"`, đọc mốc còn 5 phút / 1 phút.
