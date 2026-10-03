import { Globe2, Headphones, ShieldCheck, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { SectionBadge } from "@/components/ui/section-badge";
import { ButtonLink } from "@/components/ui/button";

const trust = [
  { icon: ShieldCheck, label: "SSL Secured" },
  { icon: Globe2, label: "150+ Countries" },
  { icon: Headphones, label: "24/7 Support" },
];

export function CallToAction() {
  return (
    <section className="relative w-full overflow-hidden bg-primary/[0.06] py-20 md:py-28 lg:py-32">
      <div
        aria-hidden
        className="grid-overlay absolute inset-0 opacity-80"
      />
      <div
        aria-hidden
        className="bloom -left-32 top-1/4 size-[28rem] opacity-20"
        style={{ background: "var(--primary)" }}
      />
      <div
        aria-hidden
        className="bloom -right-32 bottom-0 size-[30rem] opacity-15"
        style={{ background: "var(--primary)" }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />

      <PageContainer className="relative flex flex-col items-center gap-7 text-center">
        <SectionBadge icon={Sparkles}>Start Your Journey</SectionBadge>

        <h2 className="max-w-3xl text-[clamp(2rem,1.25rem+3vw,3.5rem)] font-extrabold leading-[1.08] tracking-[-0.045em] text-balance">
          Ready to Grow Your{" "}
          <span className="text-primary">Wealth?</span>
        </h2>

        <p className="max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-base md:leading-8 md:text-[17px]">
          Join thousands of investors already earning daily returns. Choose a
          plan, fund your account, and start growing from your very first
          deposit.
        </p>

        <div className="mt-1 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/register" size="lg">
            Create Free Account
          </ButtonLink>
          <ButtonLink href="/invest-plans" variant="surface" size="lg">
            View Investment Plans
          </ButtonLink>
        </div>

        <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm text-muted-foreground">
          {trust.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label} className="flex items-center gap-1.5">
                <Icon size={15} className="text-primary" />
                <span>{item.label}</span>
              </li>
            );
          })}
        </ul>
      </PageContainer>
    </section>
  );
}
