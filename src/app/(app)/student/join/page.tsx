import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { JoinForm } from "./form";

export const metadata: Metadata = { title: "Vào lớp" };

export default async function JoinPage() {
  await requireRole("student", "admin");
  return <JoinForm />;
}
