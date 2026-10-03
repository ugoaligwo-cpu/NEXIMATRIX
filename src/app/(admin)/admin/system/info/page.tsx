import type { Metadata } from "next";
import { SystemInfo } from "@/components/admin/system-info";

export const metadata: Metadata = { title: "System Information" };
export default function SystemInfoPage() { return <SystemInfo />; }
