import type { Metadata } from "next";
import { HomepageSections } from "@/components/admin/homepage-sections";

export const metadata: Metadata = { title: "Homepage Sections" };
export default function HomepageSectionsPage() { return <HomepageSections />; }
