import type { Metadata } from "next";
import { EarningHolidays } from "@/components/admin/earning-holidays";

export const metadata: Metadata = { title: "Earning Holidays" };

export default function EarningHolidaysPage() {
  return <EarningHolidays />;
}
