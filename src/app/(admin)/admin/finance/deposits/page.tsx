import type { Metadata } from "next";
import { AdminDepositsView } from "@/components/admin/admin-deposits";

export const metadata: Metadata = {
  title: "Deposit Requests",
};

export default function AdminDepositsPage() {
  return <AdminDepositsView />;
}
