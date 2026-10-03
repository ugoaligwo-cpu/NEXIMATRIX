import type { Metadata } from "next";
import { Newsletter } from "@/components/admin/newsletter";

export const metadata: Metadata = { title: "Newsletters" };
export default function NewslettersPage() { return <Newsletter />; }
