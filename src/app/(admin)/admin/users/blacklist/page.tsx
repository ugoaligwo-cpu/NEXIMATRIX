import type { Metadata } from "next";
import { BlacklistManagement } from "@/components/admin/blacklist-management";

export const metadata: Metadata = { title: "Accounts Blacklist" };

export default function BlacklistPage() {
  return <BlacklistManagement />;
}
