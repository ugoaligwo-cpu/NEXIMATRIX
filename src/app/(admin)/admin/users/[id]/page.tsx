import type { Metadata } from "next";
import { UserDetail } from "@/components/admin/user-detail";

export const metadata: Metadata = { title: "User Detail" };
export default function UserDetailPage() { return <UserDetail />; }
