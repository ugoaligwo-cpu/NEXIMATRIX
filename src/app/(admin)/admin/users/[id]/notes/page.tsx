import type { Metadata } from "next";
import { UserDetail } from "@/components/admin/user-detail";

export const metadata: Metadata = { title: "User Notes" };
export default function UserNotesPage() { return <UserDetail />; }
