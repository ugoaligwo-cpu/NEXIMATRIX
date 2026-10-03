import type { Metadata } from "next";
import { NewsArticles } from "@/components/admin/news-articles";

export const metadata: Metadata = { title: "News & Articles" };
export default function NewsPage() { return <NewsArticles />; }
