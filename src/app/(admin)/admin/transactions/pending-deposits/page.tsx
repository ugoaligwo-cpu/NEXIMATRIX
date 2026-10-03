import type { Metadata } from "next";
import { PendingDeposits } from "@/components/admin/pending-deposits";

export const metadata: Metadata = { title: "Pending Deposits" };

export default function PendingDepositsPage() {
  return <PendingDeposits />;
}
