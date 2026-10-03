import type { Metadata } from "next";
import { InvestmentsView } from "@/components/dashboard/investments-view";

export const metadata: Metadata = {
  title: "Invest & Earn",
};

export default function InvestPage() {
  return <InvestmentsView />;
}
