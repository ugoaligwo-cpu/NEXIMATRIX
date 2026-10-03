import type { Metadata } from "next";
import { BonusManagement } from "@/components/admin/bonus-management";

export const metadata: Metadata = { title: "Bonus Management" };
export default function BonusesPage() { return <BonusManagement />; }
