import type { Metadata } from "next";
import { ReferralsView } from "@/components/dashboard/referrals-view";

export const metadata: Metadata = {
  title: "Referrals",
};

export default function ReferralsPage() {
  return <ReferralsView />;
}
