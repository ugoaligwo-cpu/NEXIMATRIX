import type { Metadata } from "next";
import { InvestmentDetailView } from "@/components/dashboard/investment-detail-view";

export const metadata: Metadata = {
  title: "Investment Detail",
};

export default async function InvestmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return <InvestmentDetailView />;
}
