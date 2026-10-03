import type { Metadata } from "next";
import { DepositView } from "@/components/dashboard/deposit-view";

export const metadata: Metadata = {
  title: "Deposit",
};

export default function DepositPage() {
  return <DepositView />;
}
