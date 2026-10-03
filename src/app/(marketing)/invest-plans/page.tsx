import type { Metadata } from "next";
import { Bell, Clock3, ShieldCheck, UserRound } from "lucide-react";
import { CallToAction } from "@/components/marketing/cta";
import { InvestmentShowcase } from "@/components/marketing/investment-showcase";
import { PageHero } from "@/components/marketing/page-hero";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";

export const metadata: Metadata = {
  title: "Account Center",
  description: "Explore the account management tools available in this release.",
};

export default function InvestmentPlansPage() {
  return (
    <>
      <PageHero eyebrow="Account Center" icon={ShieldCheck} title={<>Manage your <span className="text-primary">account</span></>} description="Explore the profile, support, notification, and activity tools available in this release.">
        <span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-primary" /> Secure access</span>
        <span className="flex items-center gap-1.5"><UserRound size={15} className="text-primary" /> Profile tools</span>
        <span className="flex items-center gap-1.5"><Bell size={15} className="text-primary" /> Notifications</span>
        <span className="flex items-center gap-1.5"><Clock3 size={15} className="text-primary" /> Activity history</span>
      </PageHero>
      <InvestmentShowcase />
      <TestimonialsSection />
      <CallToAction />
    </>
  );
}
