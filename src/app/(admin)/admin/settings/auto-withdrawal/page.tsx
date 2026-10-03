import type { Metadata } from "next";
import { AutoWithdrawalSettings } from "@/components/admin/auto-withdrawal-settings";

export const metadata: Metadata = { title: "Auto-Withdrawal Settings" };

export default function AutoWithdrawalSettingsPage() {
  return <AutoWithdrawalSettings />;
}
