import { PageSection } from "@/components/ui/page-section";
import { Reveal } from "@/components/ui/reveal";
import { InvestmentCalculator } from "@/components/marketing/investment-calculator";
import { PlanCard } from "@/components/marketing/plan-card";
import { SectionHeading } from "@/components/marketing/section-heading";
import { plans } from "@/lib/data";

export function InvestmentShowcase() {
  return (
    <PageSection id="investment-plans" tone="base" spacing="lg" width="wide">
      <div className="flex flex-col items-center gap-14">
        <Reveal>
          <SectionHeading
            eyebrow="Investment Plans"
            title="Choose Your Growth Path"
            description="Carefully designed plans to match every investor's risk appetite and growth goals. Start with as little as you're comfortable with."
          />
        </Reveal>

        {/* Three equal columns that naturally fill the available width */}
        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {plans.map((plan, index) => (
            <Reveal key={plan.id} delay={index * 90} className="h-full">
              <PlanCard plan={plan} />
            </Reveal>
          ))}
        </div>

        <Reveal className="w-full">
          <InvestmentCalculator />
        </Reveal>
      </div>
    </PageSection>
  );
}
