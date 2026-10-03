import type { Metadata } from "next";
import { NewInvestmentView } from "@/components/dashboard/new-investment-view";

export const metadata: Metadata = {
  title: "New Investment",
};

export default async function NewInvestmentPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; amount?: string }>;
}) {
  await searchParams;
  return <NewInvestmentView />;
}
