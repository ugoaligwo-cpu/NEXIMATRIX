import type { Metadata } from "next";
import { AdminActivity } from "@/components/admin/admin-activity";

export const metadata: Metadata = { title: "Admin activity" };

export default function AdminActivityPage() {
  return <AdminActivity />;
}
