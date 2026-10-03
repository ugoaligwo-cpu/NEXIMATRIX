import type { Metadata } from "next";
import { AdminPlansView } from "@/components/admin/admin-plans";

export const metadata: Metadata = {
  title: "Investment Plans",
};

export default function AdminPlansPage() {
  return <AdminPlansView />;
}
