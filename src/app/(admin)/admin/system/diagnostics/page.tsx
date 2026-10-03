import type { Metadata } from "next";
import { SystemDiagnostics } from "@/components/admin/system-diagnostics";

export const metadata: Metadata = { title: "System Diagnostics" };
export default function DiagnosticsPage() { return <SystemDiagnostics />; }
