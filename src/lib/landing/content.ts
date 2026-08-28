/* ------------------------------------------------------------------ *
 * Nội dung landing page, song ngữ Việt–Anh.
 *
 * Dự án CHƯA có hạ tầng i18n (không next-intl, không message catalog) và
 * toàn bộ app phía trong vẫn thuần Việt. Cố tình giữ song ngữ gói gọn ở
 * đúng trang này: một object, hai khoá, không đụng tới phần còn lại.
 * Khi nào cần i18n thật thì thay bằng thư viện, không mở rộng file này.
 *
 * Chỉ mô tả những gì ĐÃ chạy được. Phòng thi lockdown (P6) chưa làm nên
 * gắn nhãn "sắp có" — landing hứa quá là nợ phải trả bằng uy tín.
 * ------------------------------------------------------------------ */

export const LOCALES = ["vi", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABEL: Record<Locale, string> = { vi: "Tiếng Việt", en: "English" };

type Feature = {
  key: string;
  icon: "assignment" | "quiz" | "analytics" | "attendance" | "materials" | "exam";
  title: string;
  body: string;
  soon?: boolean;
};

type Audience = { key: string; title: string; body: string };

export type LandingCopy = {
  htmlLang: string;
  nav: { login: string; features: string; forWho: string };
  hero: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    body: string;
    ctaPrimary: string;
    ctaSecondary: string;
    note: string;
  };
  featuresHeading: string;
  featuresSub: string;
  features: Feature[];
  audienceHeading: string;
  audiences: Audience[];
  soonLabel: string;
  closing: { title: string; body: string; cta: string };
  footer: string;
  langSwitchLabel: string;
};

export const COPY: Record<Locale, LandingCopy> = {
  vi: {
    htmlLang: "vi",
    nav: { login: "Đăng nhập", features: "Tính năng", forWho: "Dành cho ai" },
    hero: {
      eyebrow: "Nền tảng học tập của trung tâm",
      title: "Lớp SAT gọn gàng,",
      titleAccent: "chấm bài tự động.",
      body:
        "Giao bài, chấm trắc nghiệm ngay khi học sinh nộp, điểm danh theo buổi và " +
        "nhìn ra cả lớp đang vướng câu nào — tất cả trong một chỗ.",
      ctaPrimary: "Đăng nhập",
      ctaSecondary: "Xem tính năng",
      note: "Tài khoản do trung tâm cấp. Chưa có thì hỏi giáo viên phụ trách lớp.",
    },
    featuresHeading: "Có gì bên trong",
    featuresSub: "Những thứ đang chạy thật, không phải bản demo.",
    features: [
      {
        key: "assignment",
        icon: "assignment",
        title: "Giao bài & chấm",
        body:
          "Bài nháp hay giao ngay, có hạn nộp và đính kèm. Chấm kèm nhận xét rồi " +
          "trả một lượt — điểm chỉ hiện với học sinh khi giáo viên bấm trả bài.",
      },
      {
        key: "quiz",
        icon: "quiz",
        title: "Trắc nghiệm tự chấm",
        body:
          "Nhập đề bằng CSV, máy chấm ngay khi học sinh nộp. Luật grid-in đúng " +
          "chuẩn SAT: 3/4, .75 và 0.75 tính là một đáp án.",
      },
      {
        key: "analytics",
        icon: "analytics",
        title: "Dashboard câu sai",
        body:
          "Heatmap câu × học sinh, xếp hạng câu sai nhiều nhất, tách theo mảng " +
          "kiến thức. Nhìn phát biết cả lớp yếu chỗ nào.",
      },
      {
        key: "attendance",
        icon: "attendance",
        title: "Điểm danh theo buổi",
        body:
          "Mặc định cả lớp có mặt, chỉ bấm vào người vắng. Sửa lịch sử bằng cách " +
          "mở lại buổi cũ. Học sinh xem được tỉ lệ chuyên cần của mình.",
      },
      {
        key: "materials",
        icon: "materials",
        title: "Thông báo & tài liệu",
        body:
          "Bảng tin lớp, ghim thông báo quan trọng, tài liệu tải lên có kiểm " +
          "quyền — file lớp này không lọt sang lớp khác.",
      },
      {
        key: "exam",
        icon: "exam",
        title: "Thi thử có giám sát",
        body:
          "Đề nhiều module theo đúng thời lượng SAT, đồng hồ tính phía máy chủ, " +
          "ghi nhận thao tác rời màn hình.",
        soon: true,
      },
    ],
    audienceHeading: "Dành cho ai",
    audiences: [
      {
        key: "teacher",
        title: "Giáo viên",
        body:
          "Tạo lớp, giao bài, chấm và trả điểm, quản lý học sinh và trợ giảng, " +
          "xem lớp mình vướng ở đâu.",
      },
      {
        key: "ta",
        title: "Trợ giảng",
        body:
          "Đúng ba việc: bảng tin, bài tập và điểm danh. Không đụng tới cài đặt " +
          "lớp hay danh sách học sinh.",
      },
      {
        key: "student",
        title: "Học sinh",
        body:
          "Vào lớp bằng mã, xem việc cần làm, nộp bài, làm trắc nghiệm và xem " +
          "lại chỗ mình sai kèm giải thích.",
      },
    ],
    soonLabel: "Sắp có",
    closing: {
      title: "Đã có tài khoản?",
      body: "Đăng nhập để vào lớp của bạn.",
      cta: "Đăng nhập",
    },
    footer: "Nền tảng học và luyện thi SAT của trung tâm.",
    langSwitchLabel: "Đổi ngôn ngữ",
  },

  en: {
    htmlLang: "en",
    nav: { login: "Sign in", features: "Features", forWho: "Who it's for" },
    hero: {
      eyebrow: "Our learning platform",
      title: "SAT classes, organised —",
      titleAccent: "graded the moment they submit.",
      body:
        "Assign work, auto-grade multiple choice on submission, take attendance " +
        "per session, and see exactly which questions the class is stuck on.",
      ctaPrimary: "Sign in",
      ctaSecondary: "See features",
      note: "Accounts are issued by the centre. Ask your class teacher if you don't have one.",
    },
    featuresHeading: "What's inside",
    featuresSub: "Things that actually run — not a mock-up.",
    features: [
      {
        key: "assignment",
        icon: "assignment",
        title: "Assign & grade",
        body:
          "Draft or publish, with due dates and attachments. Grade with feedback, " +
          "then return in one go — marks stay hidden until you hit return.",
      },
      {
        key: "quiz",
        icon: "quiz",
        title: "Self-grading quizzes",
        body:
          "Import questions from CSV; grading runs the moment a student submits. " +
          "Proper SAT grid-in rules: 3/4, .75 and 0.75 all count as one answer.",
      },
      {
        key: "analytics",
        icon: "analytics",
        title: "Wrong-answer dashboard",
        body:
          "A question × student heatmap, the most-missed questions ranked, and a " +
          "breakdown by skill area. One glance shows where the class is weak.",
      },
      {
        key: "attendance",
        icon: "attendance",
        title: "Per-session attendance",
        body:
          "Everyone present by default — you only tap the absent ones. Fix history " +
          "by reopening an old session. Students see their own attendance rate.",
      },
      {
        key: "materials",
        icon: "materials",
        title: "Announcements & materials",
        body:
          "A class stream with pinned posts, and uploads behind permission checks — " +
          "one class's files never reach another.",
      },
      {
        key: "exam",
        icon: "exam",
        title: "Proctored mock exams",
        body:
          "Multi-module papers on real SAT timings, a server-side clock, and a log " +
          "of every time a student leaves the screen.",
        soon: true,
      },
    ],
    audienceHeading: "Who it's for",
    audiences: [
      {
        key: "teacher",
        title: "Teachers",
        body:
          "Create classes, assign and grade work, return marks, manage students and " +
          "assistants, and see where the class is struggling.",
      },
      {
        key: "ta",
        title: "Teaching assistants",
        body:
          "Exactly three jobs: the stream, assignments and attendance. No access to " +
          "class settings or the roster.",
      },
      {
        key: "student",
        title: "Students",
        body:
          "Join with a class code, see what's due, submit work, take quizzes, and " +
          "review what you got wrong with explanations.",
      },
    ],
    soonLabel: "Coming soon",
    closing: {
      title: "Already have an account?",
      body: "Sign in to get to your classes.",
      cta: "Sign in",
    },
    footer: "The centre's SAT learning and test-prep platform.",
    langSwitchLabel: "Change language",
  },
};
