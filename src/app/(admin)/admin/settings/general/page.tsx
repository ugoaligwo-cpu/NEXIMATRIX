import type { Metadata } from "next";
import { SettingsGeneral } from "@/components/admin/settings-general";

export const metadata: Metadata = { title: "General Settings" };
export default function SettingsGeneralPage() { return <SettingsGeneral />; }
