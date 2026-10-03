import type { Metadata } from "next";
import { SettingsGeneral } from "@/components/admin/settings-general";

export const metadata: Metadata = { title: "Branding Settings" };
export default function BrandingPage() { return <SettingsGeneral />; }
