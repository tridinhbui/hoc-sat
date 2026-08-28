import { beforeAll, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";

import * as schema from "@/db/schema";
import { ForbiddenError } from "@/lib/auth/policy";
import type { AuthContext } from "@/lib/auth/guard";
import {
  createUser,
  createUsers,
  generateTempPassword,
  resetPassword,
  setUserActive,
  setUserRole,
} from "@/lib/repo/users";

/* ------------------------------------------------------------------ *
 * Quản trị tài khoản — PLAN.md §4, dòng "Tạo tài khoản / CSV import".
 *
 * Đây là nơi DUY NHẤT sinh ra tài khoản (better-auth đang bật
 * disableSignUp). Lọt một lỗ ở đây thì người ngoài tự cấp cho mình
 * quyền giáo viên, nên test kiểm cả 4 role chứ không chỉ "không phải
 * admin thì chặn".
 * ------------------------------------------------------------------ */

const db = drizzle(env.DB, { schema });

const ctxFor = (id: string, role: "admin" | "teacher" | "ta" | "student") =>
  ({ user: { id, role }, db }) as unknown as AuthContext;

const admin = () => ctxFor("adm1", "admin");

beforeAll(async () => {
  const now = new Date();
  await db.insert(schema.user).values([
    { id: "adm1", name: "Quản trị", email: "adm1@test.vn", role: "admin", createdAt: now, updatedAt: now },
    { id: "adm2", name: "Quản trị 2", email: "adm2@test.vn", role: "admin", createdAt: now, updatedAt: now },
    { id: "utc1", name: "GV", email: "utc1@test.vn", role: "teacher", createdAt: now, updatedAt: now },
    { id: "uta1", name: "TA", email: "uta1@test.vn", role: "ta", createdAt: now, updatedAt: now },
    { id: "usd1", name: "HS", email: "usd1@test.vn", role: "student", createdAt: now, updatedAt: now },
  ]);
});

describe("Chỉ admin được đụng vào tài khoản", () => {
  const outsiders = [
    ["giáo viên", ctxFor("utc1", "teacher")],
    ["trợ giảng", ctxFor("uta1", "ta")],
    ["học sinh", ctxFor("usd1", "student")],
  ] as const;

  for (const [label, ctx] of outsiders) {
    it(`${label} không tạo được tài khoản`, async () => {
      await expect(
        createUser(ctx, { name: "Kẻ lạ", email: `x-${label}@test.vn`, role: "teacher" }),
      ).rejects.toThrow(ForbiddenError);
    });

    it(`${label} không đặt lại được mật khẩu người khác`, async () => {
      await expect(resetPassword(ctx, "adm1")).rejects.toThrow(ForbiddenError);
    });

    it(`${label} không khoá được tài khoản`, async () => {
      await expect(setUserActive(ctx, "adm1", false)).rejects.toThrow(ForbiddenError);
    });

    it(`${label} không tự nâng mình lên admin được`, async () => {
      await expect(setUserRole(ctx, ctx.user.id, "admin")).rejects.toThrow(ForbiddenError);

      const after = await db.query.user.findFirst({ where: eq(schema.user.id, ctx.user.id) });
      expect(after?.role).not.toBe("admin");
    });
  }
});

describe("Tạo tài khoản", () => {
  it("tạo cả user lẫn account, và ép đổi mật khẩu lần đầu", async () => {
    const created = await createUser(admin(), {
      name: "Cô Mai",
      email: "co.mai@test.vn",
      role: "teacher",
    });

    const u = await db.query.user.findFirst({ where: eq(schema.user.id, created.id) });
    expect(u?.role).toBe("teacher");
    expect(u?.mustChangePassword).toBe(true);
    expect(u?.active).toBe(true);

    // Thiếu bản ghi account thì tài khoản tồn tại mà không đăng nhập được,
    // và better-auth trả 401 không kèm lý do.
    const acc = await db.query.account.findFirst({
      where: eq(schema.account.userId, created.id),
    });
    expect(acc?.providerId).toBe("credential");
    expect(acc?.issuer).toBe("local:credential");
  });

  it("không lưu mật khẩu dạng rõ ở bất kỳ đâu", async () => {
    const created = await createUser(admin(), {
      name: "Thầy Nam",
      email: "thay.nam@test.vn",
      role: "teacher",
    });

    const acc = await db.query.account.findFirst({
      where: eq(schema.account.userId, created.id),
    });
    expect(acc?.password).toBeTruthy();
    expect(acc?.password).not.toBe(created.tempPassword);
    expect(acc?.password).not.toContain(created.tempPassword);
  });

  it("chuẩn hoá email và chặn trùng, kể cả khác hoa thường", async () => {
    await createUser(admin(), { name: "A", email: "  Trung@Test.VN ", role: "student" });

    const u = await db.query.user.findFirst({ where: eq(schema.user.email, "trung@test.vn") });
    expect(u).toBeTruthy();

    await expect(
      createUser(admin(), { name: "A lần hai", email: "TRUNG@test.vn", role: "student" }),
    ).rejects.toThrow(/đã có tài khoản/);
  });

  it("chặn email sai định dạng và vai trò lạ", async () => {
    await expect(
      createUser(admin(), { name: "B", email: "khong-phai-email", role: "student" }),
    ).rejects.toThrow(/Email không hợp lệ/);

    await expect(
      // @ts-expect-error — mô phỏng form bị sửa tay
      createUser(admin(), { name: "B", email: "b@test.vn", role: "superadmin" }),
    ).rejects.toThrow(/Vai trò không hợp lệ/);
  });

  it("mật khẩu tạm đủ dài và không lặp lại", () => {
    const pws = Array.from({ length: 50 }, () => generateTempPassword());
    for (const pw of pws) expect(pw.length).toBeGreaterThanOrEqual(12);
    expect(new Set(pws).size).toBe(pws.length);
  });
});

describe("Nhập nhiều tài khoản", () => {
  it("dòng lỗi bị bỏ qua, dòng đúng vẫn được tạo", async () => {
    const res = await createUsers(admin(), [
      { line: 2, name: "HS Một", email: "hs.mot@test.vn", role: "student" },
      { line: 3, name: "HS Hai", email: "email-hong", role: "student" },
      { line: 4, name: "HS Ba", email: "hs.ba@test.vn", role: "student" },
    ]);

    expect(res.created.map((c) => c.email)).toEqual(["hs.mot@test.vn", "hs.ba@test.vn"]);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].line).toBe(3);
  });

  it("bắt được email lặp trong chính file, không chỉ trùng với DB", async () => {
    const res = await createUsers(admin(), [
      { line: 2, name: "Trùng 1", email: "trung.file@test.vn", role: "student" },
      { line: 3, name: "Trùng 2", email: "TRUNG.FILE@test.vn", role: "student" },
    ]);

    expect(res.created).toHaveLength(1);
    expect(res.errors[0].message).toMatch(/lặp lại trong file/);
  });
});

describe("Đặt lại mật khẩu", () => {
  it("đổi hash, bật lại cờ đổi mật khẩu, và xoá session đang mở", async () => {
    const created = await createUser(admin(), {
      name: "Cần reset",
      email: "reset@test.vn",
      role: "student",
    });
    await db
      .update(schema.user)
      .set({ mustChangePassword: false })
      .where(eq(schema.user.id, created.id));

    // Một phiên đang đăng nhập — reset mà không xoá thì người kia vẫn dùng tiếp.
    await db.insert(schema.session).values({
      id: "sess-reset",
      userId: created.id,
      token: "tok-reset",
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const before = await db.query.account.findFirst({
      where: eq(schema.account.userId, created.id),
    });
    const newPw = await resetPassword(admin(), created.id);
    const after = await db.query.account.findFirst({
      where: eq(schema.account.userId, created.id),
    });

    expect(newPw).not.toBe(created.tempPassword);
    expect(after?.password).not.toBe(before?.password);

    const u = await db.query.user.findFirst({ where: eq(schema.user.id, created.id) });
    expect(u?.mustChangePassword).toBe(true);

    const sessions = await db.query.session.findMany({
      where: eq(schema.session.userId, created.id),
    });
    expect(sessions).toHaveLength(0);
  });
});

describe("Khoá tài khoản và đổi vai trò", () => {
  it("khoá thì xoá luôn session đang mở", async () => {
    const created = await createUser(admin(), {
      name: "Sẽ bị khoá",
      email: "khoa@test.vn",
      role: "student",
    });
    await db.insert(schema.session).values({
      id: "sess-khoa",
      userId: created.id,
      token: "tok-khoa",
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await setUserActive(admin(), created.id, false);

    const u = await db.query.user.findFirst({ where: eq(schema.user.id, created.id) });
    expect(u?.active).toBe(false);
    expect(
      await db.query.session.findMany({ where: eq(schema.session.userId, created.id) }),
    ).toHaveLength(0);
  });

  it("admin không tự khoá và không tự bỏ quyền của mình", async () => {
    // Tự nhốt mình ngoài cửa thì không có ai mở hộ — hệ thống chỉ có một
    // đường tạo tài khoản, và nó nằm sau quyền admin.
    await expect(setUserActive(admin(), "adm1", false)).rejects.toThrow(ForbiddenError);
    await expect(setUserRole(admin(), "adm1", "teacher")).rejects.toThrow(ForbiddenError);

    const me = await db.query.user.findFirst({ where: eq(schema.user.id, "adm1") });
    expect(me?.active).toBe(true);
    expect(me?.role).toBe("admin");
  });

  it("nhưng admin này hạ quyền được admin khác", async () => {
    await expect(setUserRole(admin(), "adm2", "teacher")).resolves.toBeUndefined();
    const other = await db.query.user.findFirst({ where: eq(schema.user.id, "adm2") });
    expect(other?.role).toBe("teacher");
  });
});
