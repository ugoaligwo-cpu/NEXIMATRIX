import { Star } from "lucide-react";
import { PageSection } from "@/components/ui/page-section";
import { Reveal } from "@/components/ui/reveal";
import { SectionBadge } from "@/components/ui/section-badge";
import { Testimonials } from "@/components/marketing/testimonials";
import { siteConfig } from "@/config/site";

export function TestimonialsSection() {
  return (
    <PageSection id="testimonials" tone="warm" spacing="lg" bleed={false}>
      <div className="flex flex-col items-center gap-10">
        <Reveal className="flex flex-col items-center gap-5 text-center">
          <SectionBadge icon={Star}>Testimonials</SectionBadge>
          <h2 className="max-w-3xl text-[clamp(1.9rem,1.2rem+2.4vw,3.25rem)] font-extrabold leading-[1.1] tracking-[-0.04em] text-balance">
            Loved by Investors Worldwide
          </h2>
          <p className="max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-base md:leading-8 md:text-[17px]">
            Don&apos;t just take our word for it. Here&apos;s what investors say
            about their experience with {siteConfig.name}.
          </p>
        </Reveal>

        <Reveal delay={80} className="w-full">
          <Testimonials />
        </Reveal>
      </div>
    </PageSection>
  );
}
