import type { Metadata } from "next";
import { SystemStatus } from "@/components/admin/system-status";

export const metadata: Metadata = {
  title: "System Status",
};

export default function SystemStatusPage() {
  return <SystemStatus />;
}
