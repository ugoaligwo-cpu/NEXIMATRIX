import type { Metadata } from "next";
import { AdminManagement } from "@/components/admin/admin-management";

export const metadata: Metadata = { title: "Admin Accounts" };
export default function AdminsPage() { return <AdminManagement />; }
