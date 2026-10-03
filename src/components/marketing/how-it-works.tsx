import { CircleDollarSign, TrendingUp, UserPlus, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageSection } from "@/components/ui/page-section";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";

type Step = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    icon: UserPlus,
    title: "Create Account",
    description:
      "Sign up in seconds with just your email. Quick, easy, and secure registration.",
  },
  {
    icon: Wallet,
    title: "Fund Your Wallet",
    description:
      "Deposit using crypto or bank transfer. Multiple payment methods available.",
  },
  {
    icon: TrendingUp,
    title: "Choose a Plan",
    description:
      "Select an investment plan that matches your goals and start earning daily.",
  },
  {
    icon: CircleDollarSign,
    title: "Earn & Withdraw",
    description:
      "Receive daily profits and withdraw your earnings anytime you want.",
  },
];

export function HowItWorks() {
  return (
    <PageSection id="how-it-works" tone="warm" className="section-hairline">
      <div className="flex flex-col items-center gap-14">
        <SectionHeading
          eyebrow="How It Works"
          title="Start Earning in 4 Simple Steps"
          description="Our streamlined process makes investing accessible to everyone. Get started in minutes and watch your portfolio grow."
        />

        <div className="relative grid w-full grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Desktop connector rail */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-10 hidden h-px lg:block"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in srgb, var(--primary) 55%, transparent) 12%, color-mix(in srgb, var(--primary) 55%, transparent) 88%, transparent)",
            }}
          />

          {steps.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal
                key={item.title}
                delay={index * 90}
                className="group relative flex flex-col items-center text-center"
              >
                <div className="relative">
                  {/* Step number badge overlapping the icon tile */}
                  <span className="absolute -left-3 -top-3 z-10 grid size-9 place-items-center rounded-full border border-primary/40 bg-shell text-[13px] font-extrabold text-primary shadow-[0_8px_20px_rgba(248,129,45,0.25)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="grid size-20 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/50 group-hover:bg-primary/18">
                    <Icon size={32} />
                  </span>
                </div>

                <h3 className="mt-6 text-lg font-extrabold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2.5 max-w-[250px] text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </PageSection>
  );
}
