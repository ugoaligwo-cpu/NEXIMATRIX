import type { Metadata } from "next";
import { AddFunds } from "@/components/admin/add-funds";

export const metadata: Metadata = { title: "Add Funds" };

export default function AddFundsPage() {
  return <AddFunds />;
}
