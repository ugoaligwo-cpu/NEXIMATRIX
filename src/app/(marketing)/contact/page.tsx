import type { Metadata } from "next";
import { Send } from "lucide-react";
import { PageSection } from "@/components/ui/page-section";
import { Reveal } from "@/components/ui/reveal";
import { CallToAction } from "@/components/marketing/cta";
import { ContactChannels, ContactForm } from "@/components/marketing/contact-form";
import { PageHero } from "@/components/marketing/page-hero";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Have a question or need assistance? Reach out to Neximatrix.com through any of the channels below.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Get In Touch"
        icon={Send}
        title={
          <>
            We&apos;d Love to <span className="text-primary">Hear From You</span>
          </>
        }
        description="Have a question or need assistance? Reach out to us through any of the channels below. Our team is ready to help."
      />

      <PageSection tone="base" spacing="lg">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8">
          <Reveal>
            <ContactChannels />
          </Reveal>
          <Reveal delay={80}>
            <ContactForm />
          </Reveal>
        </div>
      </PageSection>

      <CallToAction />
    </>
  );
}
