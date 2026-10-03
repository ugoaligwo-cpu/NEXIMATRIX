import type { Metadata } from "next";
import { FaqManager } from "@/components/admin/faq-manager";

export const metadata: Metadata = { title: "FAQ Management" };
export default function FaqPage() { return <FaqManager />; }
