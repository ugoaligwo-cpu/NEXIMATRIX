import { CallToAction } from "@/components/marketing/cta";
import { Features } from "@/components/marketing/features";
import { HomeHero } from "@/components/marketing/home-hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { InvestmentShowcase } from "@/components/marketing/investment-showcase";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HowItWorks />
      <Features />
      <InvestmentShowcase />
      <TestimonialsSection />
      <CallToAction />
    </>
  );
}
