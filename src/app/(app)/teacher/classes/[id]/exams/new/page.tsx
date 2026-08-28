import type { Metadata } from "next";
import { requireClassRole } from "@/lib/auth/guard";
import { TEACHER_ONLY } from "@/lib/auth/policy";
import { ExamForm } from "@/components/exam/exam-form";

export const metadata: Metadata = { title: "Tạo đề thi" };

export default async function NewExam({ params }: PageProps<"/teacher/classes/[id]/exams/new">) {
  const { id } = await params;
  const ctx = await requireClassRole(id, TEACHER_ONLY);
  return <ExamForm classId={id} subject={ctx.klass.subject} />;
}
