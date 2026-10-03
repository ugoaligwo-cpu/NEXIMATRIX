import type { Metadata } from "next";
import { RecordsView } from "@/components/admin/records-view";

export const metadata: Metadata = { title: "Transactions" };

export default function TransactionsPage() {
  return <RecordsView />;
}
