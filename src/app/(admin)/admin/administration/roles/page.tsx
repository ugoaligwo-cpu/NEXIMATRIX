import type { Metadata } from "next";
import { AdminManagement } from "@/components/admin/admin-management";

export const metadata: Metadata = { title: "Admin Roles" };
export default function RolesPage() { return <AdminManagement />; }
