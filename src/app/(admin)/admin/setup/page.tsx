import type { Metadata } from "next";
import { HyipImport } from "@/components/admin/hyip-import";

export const metadata: Metadata = { title: "HYIP import" };

export default function AdminSetupPage() {
  return <HyipImport />;
}
