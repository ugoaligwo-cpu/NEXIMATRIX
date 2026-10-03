import type { Metadata } from "next";
import { SystemLogs } from "@/components/admin/system-logs";

export const metadata: Metadata = { title: "System Logs" };
export default function SystemLogsPage() { return <SystemLogs />; }
