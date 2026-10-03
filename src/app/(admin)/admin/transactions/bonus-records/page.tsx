import type { Metadata } from "next";
import { BonusRecords } from "@/components/admin/bonus-records";

export const metadata: Metadata = { title: "Add Bonus" };

export default function BonusRecordsPage() {
  return <BonusRecords />;
}
