import type { Metadata } from "next";
import { WithdrawalRequests } from "@/components/admin/withdrawal-requests";

export const metadata: Metadata = { title: "Withdrawal Requests" };

export default function WithdrawalRequestsPage() {
  return <WithdrawalRequests />;
}
