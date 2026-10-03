import type { Metadata } from "next";
import { EmailLogs } from "@/components/admin/email-logs";

export const metadata: Metadata = { title: "Email Delivery Logs" };
export default function EmailLogsPage() { return <EmailLogs />; }
