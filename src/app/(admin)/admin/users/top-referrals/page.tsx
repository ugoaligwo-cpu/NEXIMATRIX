import type { Metadata } from "next";
import { TopReferrals } from "@/components/admin/top-referrals";

export const metadata: Metadata = { title: "Top Referral Earnings" };

export default function TopReferralsPage() {
  return <TopReferrals />;
}
