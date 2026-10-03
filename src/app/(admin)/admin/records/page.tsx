import type { Metadata } from "next";
import { RecordsView } from "@/components/admin/records-view";

export const metadata: Metadata = {
  title: "Transaction Records",
};

export default function RecordsPage() {
  return <RecordsView />;
}
