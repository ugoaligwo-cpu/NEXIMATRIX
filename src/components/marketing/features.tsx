import {
  Globe2,
  Headphones,
  LockKeyhole,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageSection } from "@/components/ui/page-section";
import { Reveal } from "@/components/ui/reveal";
import { SectionHeading } from "@/components/marketing/section-heading";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Get started in minutes. No paperwork, no delays — invest instantly with a streamlined onboarding process.",
  },
  {
    icon: Wallet,
    title: "Flexible Deposits",
    description:
      "Multiple payment options including crypto and bank transfers. Deposit and withdraw on your own terms.",
  },
  {
    icon: LockKeyhole,
    title: "Bank-Grade Security",
    description:
      "Your assets are protected with SSL encryption, DDoS protection, and industry-leading security protocols.",
  },
  {
    icon: TrendingUp,
    title: "Daily Profits",
    description:
      "Watch your portfolio grow daily with consistent, transparent profit distributions to your account.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description:
      "Our dedicated team is available around the clock to assist you with any questions or concerns.",
  },
  {
    icon: Globe2,
    title: "Global Access",
    description:
      "Invest from anywhere in the world. Our platform supports investors across multiple countries and currencies.",
  },
];

export function Features() {
  return (
    <PageSection id="features" tone="base" spacing="lg">
      <div className="flex flex-col items-center gap-14">
        <Reveal>
          <SectionHeading
            eyebrow="Why Choose Us"
            title="Built for Serious Investors"
            description="We combine cutting-edge technology with proven investment strategies to maximize your returns while minimizing risk."
          />
        </Reveal>

        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={(index % 3) * 90} className="h-full">
                <article className="ui-card ui-card-hover group flex h-full flex-col gap-4 rounded-2xl p-6 md:p-7">
                  <span className="grid size-12 place-items-center rounded-xl bg-primary/12 text-primary transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-primary group-hover:text-white">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-1 text-lg font-extrabold tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-6 text-muted-foreground md:text-[15px] md:leading-7">
                    {item.description}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </PageSection>
  );
}
