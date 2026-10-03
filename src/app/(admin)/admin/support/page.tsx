import type { Metadata } from "next";
import { AdminSupport } from "@/components/admin/admin-support";

export const metadata: Metadata = { title: "Admin support" };

export default function AdminSupportPage() {
  return <AdminSupport />;
}
