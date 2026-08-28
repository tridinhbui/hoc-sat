/**
 * Audit hàng rào phân quyền.
 *
 * D1 không có RLS, nên mọi server action và mọi route handler PHẢI đi qua
 * một guard. Script này soát bằng máy thay vì bằng mắt — thêm action mới
 * mà quên guard thì CI đỏ ngay.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const GUARDS = ["requireUser", "requireRole", "requireClassRole", "requireOwnSubmission"];

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

const problems = [];

// 1) Mọi file "use server" phải dùng guard trong từng hàm export.
for (const file of walk("src/lib/actions")) {
  const src = readFileSync(file, "utf8");
  if (!src.includes('"use server"')) continue;

  // Cắt theo từng hàm export để không bị "một guard ở đầu file" đánh lừa.
  const fns = src.split(/\nexport async function /).slice(1);
  for (const fn of fns) {
    const name = fn.slice(0, fn.indexOf("("));
    const body = fn.slice(0, fn.indexOf("\n}\n") + 1 || undefined);
    if (!GUARDS.some((g) => body.includes(g))) {
      problems.push(`${file} → ${name}() không gọi guard nào`);
    }
  }
}

// 2) Mọi route handler phải dùng guard.
for (const file of walk("src/app/api")) {
  const src = readFileSync(file, "utf8");
  if (!/export (async )?function (GET|POST|PUT|PATCH|DELETE)/.test(src)) continue;
  if (!GUARDS.some((g) => src.includes(g))) {
    problems.push(`${file} → route handler không gọi guard nào`);
  }
}

// 3) Không file nào ngoài repo/auth/db được import db trực tiếp.
const ALLOWED = ["src/lib/repo/", "src/lib/auth/", "src/db/"];
for (const file of walk("src")) {
  if (ALLOWED.some((a) => file.startsWith(a))) continue;
  const src = readFileSync(file, "utf8");
  if (/from "@\/db"/.test(src)) problems.push(`${file} → import "@/db" ngoài repo layer`);
}

if (problems.length) {
  console.error(`\n✘ ${problems.length} chỗ hở:\n`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log("✓ Mọi server action và route handler đều đi qua guard.");
