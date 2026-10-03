import type { Metadata } from "next";
import { AdminProfile } from "@/components/admin/admin-profile";

export const metadata: Metadata = { title: "Admin Profile" };

export default function AdminProfilePage() {
  return <AdminProfile />;
}
