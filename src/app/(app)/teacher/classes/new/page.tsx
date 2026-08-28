import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { NewClassWizard } from "./wizard";

export const metadata: Metadata = { title: "Tạo lớp mới" };

export default async function NewClassPage() {
  await requireRole("teacher", "admin");
  return <NewClassWizard />;
}
