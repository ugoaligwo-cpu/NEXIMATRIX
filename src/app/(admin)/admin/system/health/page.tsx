import type { Metadata } from "next";
import { SystemHealth } from "@/components/admin/system-health";

export const metadata: Metadata = { title: "System Health" };
export default function SystemHealthPage() { return <SystemHealth />; }
