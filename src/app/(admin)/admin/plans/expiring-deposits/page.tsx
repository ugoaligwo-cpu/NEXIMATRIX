import type { Metadata } from "next";
import { ExpiringDeposits } from "@/components/admin/expiring-deposits";

export const metadata: Metadata = { title: "Expiring Deposits" };

export default function ExpiringDepositsPage() {
  return <ExpiringDeposits />;
}
