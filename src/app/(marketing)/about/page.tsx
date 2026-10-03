import type { Metadata } from "next";
import { Award, Building2, Globe2, ShieldCheck, Target, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageSection } from "@/components/ui/page-section";
import { Reveal } from "@/components/ui/reveal";
import { SectionBadge } from "@/components/ui/section-badge";
import { CallToAction } from "@/components/marketing/cta";
import { PageHero } from "@/components/marketing/page-hero";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";

export const metadata: Metadata = { title: "About Us", description: "Learn about our mission, our values, and our approach to secure account management." };

type Value = { icon: LucideIcon; title: string; description: string };
const values: Value[] = [
  { icon: ShieldCheck, title: "Security First", description: "Your account data is protected with server-side authorization and secure session controls." },
  { icon: Users, title: "People Centered", description: "We build trust through transparency and put account owners at the center of everything." },
  { icon: Globe2, title: "Accessible Support", description: "Our account center is designed for clear, accessible support wherever you are." },
  { icon: Target, title: "Clear by Design", description: "Every decision is driven by dependable account tools and understandable workflows." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About Us" icon={Building2} title={<>The story behind <span className="text-primary">Neximatrix.com</span></>} description="Learn about our mission, our values, and our approach to secure account management." />
      <PageSection tone="base" spacing="lg" width="narrow">
        <Reveal className="flex flex-col items-start gap-6"><SectionBadge>Our Story</SectionBadge><h2 className="text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] font-extrabold leading-[1.12] tracking-[-0.04em]">Welcome to Neximatrix.com</h2><div className="flex flex-col gap-5 text-[15px] leading-8 text-muted-foreground md:text-base md:leading-9"><p>Neximatrix.com is focused on making account management clear and dependable. We combine thoughtful design with secure server-side controls so people can manage their profiles and support requests with confidence.</p><p>Our account center keeps permitted profile information, notifications, support conversations, and activity history in one focused workspace. Financial actions are intentionally outside the scope of this release.</p><p>We believe trusted technology should be understandable, accessible, and grounded in responsible communication.</p></div></Reveal>
      </PageSection>
      <PageSection tone="raised" spacing="lg" className="section-hairline">
        <div className="flex flex-col items-center gap-14"><Reveal className="flex flex-col items-center gap-5 text-center"><SectionBadge icon={Award}>Our Values</SectionBadge><h2 className="max-w-2xl text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] font-extrabold leading-[1.12] tracking-[-0.04em] text-balance">What We Stand For</h2><p className="max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-base md:leading-8">Four principles guide every product decision, partnership, and support interaction.</p></Reveal><div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">{values.map((value, index) => { const Icon = value.icon; return <Reveal key={value.title} delay={index * 80} className="h-full"><article className="ui-card ui-card-hover group flex h-full flex-col rounded-2xl p-6"><span className="grid size-12 place-items-center rounded-xl bg-primary/12 text-primary transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-primary group-hover:text-white"><Icon size={22} /></span><h3 className="mt-5 text-base font-extrabold">{value.title}</h3><p className="mt-2.5 text-sm leading-6 text-muted-foreground">{value.description}</p></article></Reveal>; })}</div></div>
      </PageSection>
      <TestimonialsSection /><CallToAction />
    </>
  );
}
