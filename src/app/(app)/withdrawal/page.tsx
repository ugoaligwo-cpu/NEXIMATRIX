import type { Metadata } from "next";
import { WithdrawalView } from "@/components/dashboard/withdrawal-view";

export const metadata: Metadata = {
  title: "Withdrawal",
};

export default function WithdrawalPage() {
  return <WithdrawalView />;
}
