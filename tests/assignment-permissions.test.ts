import { beforeAll, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";

import * as schema from "@/db/schema";
import { ForbiddenError } from "@/lib/auth/policy";
import type { ClassContext } from "@/lib/auth/guard";
import {
  createAssignment,
  deleteAssignment,
  getAssignment,
  gradeSubmission,
  listAssignments,
  listSubmissions,
  returnSubmission,
  setPublished,
  turnIn,
  unsubmit,
} from "@/lib/repo/assignments";

/* ------------------------------------------------------------------ *
 * Bài tập & chấm bài.
 *
 * Ba luật dễ hỏng nhất, và là lý do file này tồn tại:
 *  - bài nháp không được lộ cho học sinh dù biết id
 *  - điểm chỉ hiện SAU khi giáo viên bấm trả bài
 *  - không chấm được bài nộp thuộc lớp khác
 * ------------------------------------------------------------------ */

const db = drizzle(env.DB, { schema });

const C1 = "ac1";
const C2 = "ac2";

const ctxFor = (userId: string, classId: string, classRole: "teacher" | "ta" | "student") =>
  ({
    user: { id: userId, role: classRole === "student" ? "student" : classRole },
    db,
    classId,
    classRole,
    klass: { id: classId },
  }) as unknown as ClassContext;

const teacher = () => ctxFor("at", C1, "teacher");
const ta = () => ctxFor("aa", C1, "ta");
const student = () => ctxFor("as", C1, "student");
const student2 = () => ctxFor("as2", C1, "student");

const file = (name = "bai-lam.pdf") => [
  { r2Key: `class/${C1}/submission/x/${name}`, fileName: name, mime: null, size: 10 },
];

beforeAll(async () => {
  const now = new Date();

  await db.insert(schema.user).values([
    { id: "at", name: "GV", email: "at@t.vn", role: "teacher", createdAt: now, updatedAt: now },
    { id: "aa", name: "TA", email: "aa@t.vn", role: "ta", createdAt: now, updatedAt: now },
    { id: "as", name: "HS 1", email: "as@t.vn", role: "student", createdAt: now, updatedAt: now },
    { id: "as2", name: "HS 2", email: "as2@t.vn", role: "student", createdAt: now, updatedAt: now },
  ]);

  await db.insert(schema.classes).values([
    { id: C1, name: "Lớp A", code: "AAA999", subject: "math", teacherId: "at", createdAt: now },
    { id: C2, name: "Lớp B", code: "BBB999", subject: "rw", teacherId: "at", createdAt: now },
  ]);

  await db.insert(schema.classMembers).values([
    { id: "acm1", classId: C1, userId: "at", role: "teacher", joinedAt: now },
    { id: "acm2", classId: C1, userId: "aa", role: "ta", joinedAt: now },
    { id: "acm3", classId: C1, userId: "as", role: "student", joinedAt: now },
    { id: "acm4", classId: C1, userId: "as2", role: "student", joinedAt: now },
  ]);
});

describe("Bài nháp", () => {
  it("học sinh không mở được bài chưa giao, dù biết id", async () => {
    const id = await createAssignment(teacher(), {
      title: "Nháp",
      points: 10,
      allowLate: true,
      publish: false,
      files: [],
    });

    await expect(getAssignment(teacher(), id)).resolves.toBeTruthy();
    await expect(getAssignment(student(), id)).rejects.toThrow(ForbiddenError);

    const seen = await listAssignments(student());
    expect(seen.find((a) => a.id === id)).toBeUndefined();
  });

  it("học sinh không giao được bài", async () => {
    await expect(
      createAssignment(student(), {
        title: "HS tự giao",
        points: 10,
        allowLate: true,
        publish: true,
        files: [],
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("TA giao được bài nhưng không xoá được; giáo viên thì xoá được", async () => {
    const id = await createAssignment(ta(), {
      title: "TA giao",
      points: 10,
      allowLate: true,
      publish: true,
      files: [],
    });
    await expect(deleteAssignment(ta(), id)).rejects.toThrow(ForbiddenError);
    await expect(deleteAssignment(teacher(), id)).resolves.toBeUndefined();
  });
});

describe("Nộp bài", () => {
  it("chỉ học sinh nộp được", async () => {
    const id = await createAssignment(teacher(), {
      title: "Bài nộp thường",
      points: 100,
      allowLate: true,
      publish: true,
      files: [],
    });

    await expect(turnIn(teacher(), id, file())).rejects.toThrow(ForbiddenError);
    await expect(turnIn(student(), id, file())).resolves.toBeTruthy();
  });

  it("không nhận file của lớp khác", async () => {
    const id = await createAssignment(teacher(), {
      title: "Chống gắn file lạ",
      points: 10,
      allowLate: true,
      publish: true,
      files: [],
    });

    await expect(
      turnIn(student(), id, [
        { r2Key: `class/${C2}/submission/x/lam.pdf`, fileName: "lam.pdf", mime: null, size: 1 },
      ]),
    ).rejects.toThrow(ForbiddenError);
  });

  it("quá hạn và không cho nộp trễ thì chặn", async () => {
    const id = await createAssignment(teacher(), {
      title: "Hết hạn cứng",
      dueAt: new Date(Date.now() - 60_000),
      points: 10,
      allowLate: false,
      publish: true,
      files: [],
    });
    await expect(turnIn(student(), id, file())).rejects.toThrow(ForbiddenError);
  });

  it("quá hạn nhưng cho nộp trễ thì nhận và đánh dấu trễ", async () => {
    const id = await createAssignment(teacher(), {
      title: "Cho nộp trễ",
      dueAt: new Date(Date.now() - 60_000),
      points: 10,
      allowLate: true,
      publish: true,
      files: [],
    });
    const subId = await turnIn(student(), id, file());
    const row = await db.query.submissions.findFirst({
      where: eq(schema.submissions.id, subId),
    });
    expect(row?.isLate).toBe(true);
  });
});

describe("Chấm và trả bài", () => {
  async function seedTurnedIn(title: string, points = 100) {
    const aid = await createAssignment(teacher(), {
      title,
      points,
      allowLate: true,
      publish: true,
      files: [],
    });
    const sid = await turnIn(student(), aid, file());
    return { aid, sid };
  }

  it("học sinh không chấm được, TA và giáo viên thì được", async () => {
    const { sid } = await seedTurnedIn("Chấm thử");
    await expect(
      gradeSubmission(student(), sid, { score: 100, feedback: "tự chấm" }),
    ).rejects.toThrow(ForbiddenError);
    await expect(
      gradeSubmission(ta(), sid, { score: 80, feedback: "ổn" }),
    ).resolves.toBeUndefined();
  });

  it("không cho điểm vượt quá điểm tối đa", async () => {
    const { sid } = await seedTurnedIn("Trần điểm", 50);
    await expect(gradeSubmission(teacher(), sid, { score: 51, feedback: "" })).rejects.toThrow();
    await expect(
      gradeSubmission(teacher(), sid, { score: 50, feedback: "" }),
    ).resolves.toBeUndefined();
  });

  it("điểm chỉ lộ ra SAU khi trả bài", async () => {
    const { aid, sid } = await seedTurnedIn("Chờ trả bài");
    await gradeSubmission(teacher(), sid, { score: 90, feedback: "tốt" });

    const before = (await listAssignments(student())).find((a) => a.id === aid);
    expect(before?.myStatus).toBe("turned_in");
    expect(before?.myGrade).toBeNull();

    await returnSubmission(teacher(), sid);

    const after = (await listAssignments(student())).find((a) => a.id === aid);
    expect(after?.myStatus).toBe("returned");
    expect(after?.myGrade).toBe(90);
  });

  it("đã trả bài thì không nộp lại và không huỷ nộp được", async () => {
    const { aid, sid } = await seedTurnedIn("Khoá sau khi trả");
    await returnSubmission(teacher(), sid);

    await expect(turnIn(student(), aid, file())).rejects.toThrow(ForbiddenError);
    await expect(unsubmit(student(), aid)).rejects.toThrow(ForbiddenError);
  });

  it("không chấm được bài nộp của lớp khác", async () => {
    const { sid } = await seedTurnedIn("Của lớp A");
    const teacherOfC2 = ctxFor("at", C2, "teacher");
    await expect(
      gradeSubmission(teacherOfC2, sid, { score: 0, feedback: "phá" }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("không trả được bài học sinh chưa nộp", async () => {
    const aid = await createAssignment(teacher(), {
      title: "Chưa ai nộp",
      points: 10,
      allowLate: true,
      publish: true,
      files: [],
    });
    const sid = await turnIn(student(), aid, file());
    await unsubmit(student(), aid);
    await expect(returnSubmission(teacher(), sid)).rejects.toThrow(ForbiddenError);
  });

  it("bảng theo dõi nộp bài là của giáo viên và TA, liệt kê đủ cả lớp", async () => {
    const { aid } = await seedTurnedIn("Bảng theo dõi");
    await expect(listSubmissions(student(), aid)).rejects.toThrow(ForbiddenError);

    const rows = await listSubmissions(teacher(), aid);
    // Cả 2 học sinh đều có dòng, kể cả người chưa nộp.
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.studentId === "as2")?.status).toBe("assigned");
  });

  it("đã có người nộp thì không rút bài về nháp", async () => {
    const { aid } = await seedTurnedIn("Không rút được");
    await expect(setPublished(teacher(), aid, false)).rejects.toThrow(ForbiddenError);
  });
});

describe("Học sinh không xem được bài của nhau", () => {
  it("bảng điểm chỉ chứa bài của chính mình", async () => {
    const aid = await createAssignment(teacher(), {
      title: "Riêng tư",
      points: 10,
      allowLate: true,
      publish: true,
      files: [],
    });
    const sid = await turnIn(student(), aid, file());
    await gradeSubmission(teacher(), sid, { score: 10, feedback: "của HS 1" });
    await returnSubmission(teacher(), sid);

    const mine = (await listAssignments(student())).find((a) => a.id === aid);
    const others = (await listAssignments(student2())).find((a) => a.id === aid);

    expect(mine?.myGrade).toBe(10);
    expect(others?.myGrade).toBeNull();
    expect(others?.myStatus).toBe("assigned");
  });
});
