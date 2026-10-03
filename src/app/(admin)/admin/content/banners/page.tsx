import type { Metadata } from "next";
import { BannerManagement } from "@/components/admin/banner-management";

export const metadata: Metadata = { title: "Banner Management" };
export default function BannersPage() { return <BannerManagement />; }
