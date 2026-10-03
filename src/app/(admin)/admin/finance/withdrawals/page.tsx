import type { Metadata } from "next";
import { AdminWithdrawalsView } from "@/components/admin/admin-withdrawals";

export const metadata: Metadata = {
  title: "Withdrawal Requests",
};

export default function AdminWithdrawalsPage() {
  return <AdminWithdrawalsView />;
}
