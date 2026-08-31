"use server";

import { revalidatePath } from "next/cache";
import { requireClassRole } from "@/lib/auth/guard";
import { ANY_MEMBER, STAFF } from "@/lib/auth/policy";
import {
  createExamQuestion,
  createQuestion,
  deleteExamQuestion,
  deleteQuestion,
  importExamQuestions,
  importQuestions,
  saveAnswer,
  type ChoiceOption,
  type ImportRow,
} from "@/lib/repo/questions";
import type { ActionState } from "./classes";

function revalidateAssignment(classId: string, assignmentId: string) {
  for (const role of ["teacher", "ta", "student"]) {
    revalidatePath(`/${role}/classes/${classId}/assignments/${assignmentId}`, "page");
  }
}

/**
 * Cùng một trình soạn đề dùng cho hai chỗ: bài tập và module đề thi.
 * Form gửi lên `assignmentId` HOẶC `moduleId`, không bao giờ cả hai.
 */
function readTarget(form: FormData) {
  const assignmentId = String(form.get("assignmentId") ?? "");
  const moduleId = String(form.get("moduleId") ?? "");
  if (assignmentId) return { kind: "assignment" as const, id: assignmentId };
  if (moduleId) return { kind: "module" as const, id: moduleId };
  return null;
}

/* ----------------------------- Soạn đề ----------------------------- */

export async function addQuestionAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const target = readTarget(form);
  if (!target) return { error: "Thiếu bài tập hoặc module đích." };
  const ctx = await requireClassRole(classId, STAFF);

  const type = String(form.get("type") ?? "mcq") as "mcq" | "grid_in" | "free_text";

  const choices: ChoiceOption[] = [];
  if (type === "mcq") {
    for (const key of ["A", "B", "C", "D"]) {
      const text = String(form.get(`choice_${key}`) ?? "").trim();
      if (text) choices.push({ key, text });
    }
  }

  const acceptedRaw = String(form.get("acceptedAnswers") ?? "").trim();

  const payload = {
      type,
      prompt: String(form.get("prompt") ?? ""),
      choices: type === "mcq" ? choices : null,
      correctAnswer: String(form.get("correctAnswer") ?? ""),
      // Biến thể chấp nhận thêm, cách nhau bằng dấu phẩy: "3/4, .75"
      acceptedAnswers: acceptedRaw
        ? acceptedRaw.split(",").map((x) => x.trim()).filter(Boolean)
        : null,
      explanation: String(form.get("explanation") ?? ""),
      points: Number(form.get("points") ?? 1),
      domain: String(form.get("domain") ?? ""),
      skillTag: String(form.get("skillTag") ?? ""),
      imageR2Key: String(form.get("imageR2Key") ?? "") || null,
  };

  try {
    if (target.kind === "assignment") await createQuestion(ctx, target.id, payload);
    else await createExamQuestion(ctx, target.id, payload);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không thêm được câu hỏi." };
  }

  if (target.kind === "assignment") revalidateAssignment(classId, target.id);
  else revalidatePath(`/teacher/classes/${classId}/exams`, "layout");
  return { ok: "Đã thêm câu hỏi." };
}

export async function deleteQuestionAction(form: FormData): Promise<void> {
  const classId = String(form.get("classId") ?? "");
  const target = readTarget(form);
  if (!target) return;
  const ctx = await requireClassRole(classId, STAFF);
  const questionId = String(form.get("questionId") ?? "");

  if (target.kind === "assignment") {
    await deleteQuestion(ctx, target.id, questionId);
    revalidateAssignment(classId, target.id);
  } else {
    await deleteExamQuestion(ctx, target.id, questionId);
    revalidatePath(`/teacher/classes/${classId}/exams`, "layout");
  }
}

/**
 * Nhập đề từ CSV. Gõ tay 27 câu mỗi module quá tốn công nên đây là đường
 * chính để đưa đề vào hệ thống.
 *
 * Cột: type,prompt,A,B,C,D,correct,points,domain,skill,explanation
 */
export async function importQuestionsAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const classId = String(form.get("classId") ?? "");
  const target = readTarget(form);
  if (!target) return { error: "Thiếu bài tập hoặc module đích." };
  const ctx = await requireClassRole(classId, STAFF);

  const csv = String(form.get("csv") ?? "").trim();
  if (!csv) return { error: "Dán nội dung CSV vào đã nhé." };

  let rows: ImportRow[];
  try {
    rows = parseCsv(csv);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không đọc được CSV." };
  }
  if (rows.length === 0) return { error: "Không tìm thấy dòng nào." };

  const res =
    target.kind === "assignment"
      ? await importQuestions(ctx, target.id, rows)
      : await importExamQuestions(ctx, target.id, rows);

  if (target.kind === "assignment") revalidateAssignment(classId, target.id);
  else revalidatePath(`/teacher/classes/${classId}/exams`, "layout");

  if (res.errors.length > 0) {
    const first = res.errors.slice(0, 3).map((e) => `dòng ${e.line}: ${e.message}`).join(" · ");
    return {
      error: `Thêm được ${res.created} câu. ${res.errors.length} dòng lỗi, ${first}`,
    };
  }
  return { ok: `Đã thêm ${res.created} câu.` };
}

/**
 * CSV tối giản có hỗ trợ ô bọc trong dấu nháy kép (đề SAT hay có dấu phẩy).
 * Bỏ dòng tiêu đề nếu ô đầu tiên là "type".
 */
function parseCsv(text: string): ImportRow[] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      lines.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    lines.push(row);
  }

  const body = lines.filter((r) => r.some((c) => c.trim() !== ""));
  if (body[0]?.[0]?.trim().toLowerCase() === "type") body.shift();

  return body.map((r) => ({
    type: r[0] ?? "",
    prompt: r[1] ?? "",
    choices: [r[2] ?? "", r[3] ?? "", r[4] ?? "", r[5] ?? ""],
    correct: r[6] ?? "",
    points: r[7],
    domain: r[8],
    skill: r[9],
    explanation: r[10],
  }));
}

/* --------------------------- Học sinh làm bài --------------------------- */

export async function saveAnswerAction(input: {
  classId: string;
  submissionId: string;
  questionId: string;
  response: string | null;
  flagged?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const ctx = await requireClassRole(input.classId, ANY_MEMBER);
  try {
    await saveAnswer(ctx, input.submissionId, input.questionId, {
      response: input.response,
      flagged: input.flagged,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Không lưu được." };
  }
}
