import type { Metadata } from "next";
import { ReferralSettings } from "@/components/admin/referral-settings";

export const metadata: Metadata = { title: "Referral Settings" };
export default function ReferralSettingsPage() { return <ReferralSettings />; }
