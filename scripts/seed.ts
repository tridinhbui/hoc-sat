/**
 * Sinh scripts/seed.sql cho môi trường dev.
 *
 *   npx tsx scripts/seed.ts
 *   npm run db:seed:local
 *
 * Mật khẩu được hash bằng chính hàm của better-auth để đăng nhập được thật.
 * KHÔNG chạy file này lên production.
 */
import { hashPassword } from "better-auth/crypto";
import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const PASSWORD = "HocSAT@2026";
const now = Date.now();

type Seed = {
  key: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "ta" | "student";
  mustChange?: boolean;
};

const people: Seed[] = [
  { key: "admin", name: "Trung tâm HocSAT", email: "admin@hocsat.vn", role: "admin" },
  { key: "teacher", name: "Nguyễn Thị Lan", email: "co.lan@hocsat.vn", role: "teacher" },
  { key: "ta", name: "Trần Anh Minh", email: "ta.minh@hocsat.vn", role: "ta" },
  { key: "hs1", name: "Lê Bảo Ngọc", email: "ngoc@hocsat.vn", role: "student" },
  { key: "hs2", name: "Phạm Gia Huy", email: "huy@hocsat.vn", role: "student" },
  // Học sinh này giữ cờ mustChangePassword để test luồng đổi mật khẩu lần đầu.
  { key: "hs3", name: "Đỗ Minh Khuê", email: "khue@hocsat.vn", role: "student", mustChange: true },
];

const q = (v: string | null) => (v === null ? "NULL" : `'${v.replace(/'/g, "''")}'`);

const ids = Object.fromEntries(people.map((p) => [p.key, randomUUID()])) as Record<string, string>;
const classRw = randomUUID();
const classMath = randomUUID();

const lines: string[] = [
  "-- HocSAT seed (dev only). Sinh bởi scripts/seed.ts — đừng sửa tay.",
  "DELETE FROM class_members;",
  "DELETE FROM classes;",
  "DELETE FROM account;",
  "DELETE FROM session;",
  "DELETE FROM user;",
];

const hash = await hashPassword(PASSWORD);

for (const p of people) {
  const id = ids[p.key];
  lines.push(
    `INSERT INTO user (id,name,email,email_verified,role,must_change_password,active,created_at,updated_at) ` +
      `VALUES (${q(id)},${q(p.name)},${q(p.email)},1,${q(p.role)},${p.mustChange ? 1 : 0},1,${now},${now});`,
  );
  lines.push(
    `INSERT INTO account (id,user_id,account_id,provider_id,issuer,password,created_at,updated_at) ` +
      `VALUES (${q(randomUUID())},${q(id)},${q(id)},'credential','local:credential',${q(hash)},${now},${now});`,
  );
}

lines.push(
  `INSERT INTO classes (id,name,code,subject,teacher_id,schedule_note,archived,created_at) VALUES ` +
    `(${q(classRw)},'SAT Reading & Writing — Tối T3/T5','RWX24A','rw',${q(ids.teacher)},'19:30–21:30 T3 & T5',0,${now});`,
  `INSERT INTO classes (id,name,code,subject,teacher_id,schedule_note,archived,created_at) VALUES ` +
    `(${q(classMath)},'SAT Math — Sáng T7','MTH7B2','math',${q(ids.teacher)},'08:30–11:00 T7',0,${now});`,
);

const member = (classId: string, userKey: string, role: string) =>
  `INSERT INTO class_members (id,class_id,user_id,role,joined_at) VALUES ` +
  `(${q(randomUUID())},${q(classId)},${q(ids[userKey])},${q(role)},${now});`;

for (const c of [classRw, classMath]) {
  lines.push(member(c, "teacher", "teacher"), member(c, "ta", "ta"));
  for (const s of ["hs1", "hs2", "hs3"]) lines.push(member(c, s, "student"));
}

writeFileSync("scripts/seed.sql", lines.join("\n") + "\n");

console.log("✓ scripts/seed.sql");
console.log(`\nMật khẩu chung: ${PASSWORD}\n`);
for (const p of people) {
  console.log(`  ${p.role.padEnd(8)} ${p.email}${p.mustChange ? "  (phải đổi mật khẩu lần đầu)" : ""}`);
}
console.log("\nLớp: RWX24A (Reading & Writing) · MTH7B2 (Math)");
