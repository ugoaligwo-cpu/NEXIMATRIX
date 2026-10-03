import type { Metadata } from "next";
import { ReferralsView } from "@/components/dashboard/referrals-view";

export const metadata: Metadata = {
  title: "Referral",
};

export default function ReferralPage() {
  return <ReferralsView />;
}
