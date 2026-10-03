import type { Metadata } from "next";
import { ContentPages } from "@/components/admin/content-pages";

export const metadata: Metadata = { title: "Content Pages" };
export default function ContentPagesPage() { return <ContentPages />; }
