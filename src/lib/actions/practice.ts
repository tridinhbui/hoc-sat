"use server";

import { requireRole } from "@/lib/auth/guard";
import { gradePractice, type PracticeResult } from "@/lib/repo/practice";

/**
 * Chấm một câu luyện tập.
 *
 * Đây là đường DUY NHẤT client biết được đáp án, và chỉ sau khi đã gửi
 * câu trả lời lên. Guard nằm trong repo chứ không phải ở đây, để không ai
 * gọi tắt qua được.
 */
export async function gradePracticeAction(
  questionId: string,
  response: string,
): Promise<PracticeResult | { error: string }> {
  const ctx = await requireRole("student", "admin");

  try {
    return await gradePractice(ctx, questionId, response);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Không chấm được câu này." };
  }
}
