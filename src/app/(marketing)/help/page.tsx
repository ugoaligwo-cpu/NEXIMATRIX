import type { Metadata } from "next";
import { ChevronDown, CircleHelp, MessageCircle, Send } from "lucide-react";
import { PageSection } from "@/components/ui/page-section";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { CallToAction } from "@/components/marketing/cta";
import { PageHero } from "@/components/marketing/page-hero";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { faqs } from "@/lib/data";

export const metadata: Metadata = {
  title: "Help Center",
  description:
    "Find answers about account access, profiles, support, notifications, and activity history.",
};

export default function HelpPage() {
  return (
    <>
      <PageHero
        eyebrow="Help Center"
        icon={CircleHelp}
        title={
          <>
            How Can We <span className="text-primary">Help You?</span>
          </>
        }
        description="Find answers about account access, profiles, support, notifications, and activity history."
      />

      <PageSection tone="base" spacing="lg" width="narrow">
        <div className="flex flex-col gap-12">
          <Reveal className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              Frequently Asked Questions
            </h2>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Browse through our most commonly asked questions below.
            </p>
          </Reveal>

          <Reveal className="flex flex-col gap-3" delay={60}>
            {faqs.map((faq, index) => (
              <details
                key={faq.question}
                className="group ui-card overflow-hidden rounded-xl transition-colors duration-300 open:border-primary/35"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-left text-[15px] font-bold transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/12 text-xs font-extrabold text-primary">
                    {index + 1}
                  </span>
                  <span className="flex-1">{faq.question}</span>
                  <ChevronDown
                    size={16}
                    className="shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180"
                  />
                </summary>
                <p className="px-5 pb-5 pl-[3.25rem] text-sm leading-7 text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </Reveal>

          <Reveal delay={120}>
            <div className="ui-card flex flex-col items-center gap-6 p-8 md:flex-row md:p-10">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
                <MessageCircle size={24} />
              </span>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-lg font-extrabold tracking-tight">
                  Still Have Questions?
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Can&apos;t find the answer you&apos;re looking for? Our support
                  team is here to help you 24/7.
                </p>
              </div>
              <ButtonLink href="/contact" className="shrink-0">
                Contact Us <Send size={16} />
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </PageSection>

      <TestimonialsSection />
      <CallToAction />
    </>
  );
}
