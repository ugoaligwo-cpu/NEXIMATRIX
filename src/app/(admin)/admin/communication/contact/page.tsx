import type { Metadata } from "next";
import { ContactSubmissions } from "@/components/admin/contact-submissions";

export const metadata: Metadata = { title: "Contact Form" };
export default function ContactPage() { return <ContactSubmissions />; }
