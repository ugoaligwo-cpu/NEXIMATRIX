import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { SectionBadge } from "@/components/ui/section-badge";

export function PageHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  icon: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <section className="inner-hero-surface section-hairline relative w-full overflow-hidden">
      <div
        aria-hidden
        className="grid-overlay absolute inset-0 opacity-60"
      />
      <div
        aria-hidden
        className="bloom -right-32 -top-24 size-[26rem] opacity-25"
        style={{ background: "var(--primary)" }}
      />
      <div
        aria-hidden
        className="bloom -left-32 bottom-[-10rem] size-[24rem] opacity-20"
        style={{ background: "#b45309" }}
      />

      <PageContainer className="relative flex min-h-[300px] flex-col items-center justify-center py-14 text-center md:min-h-[360px] md:py-20">
        <SectionBadge icon={Icon} className="reveal-up">
          {eyebrow}
        </SectionBadge>

        <h1 className="reveal-up delay-1 mt-6 max-w-4xl text-[clamp(2.1rem,1.3rem+3.2vw,3.75rem)] font-extrabold leading-[1.08] tracking-[-0.045em] text-balance">
          {title}
        </h1>

        <p className="reveal-up delay-2 mt-5 max-w-2xl text-[15px] leading-7 text-white/70 sm:text-base md:leading-8 md:text-[17px]">
          {description}
        </p>

        {children ? (
          <div className="reveal-up delay-3 mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm font-medium text-white/75">
            {children}
          </div>
        ) : null}
      </PageContainer>
    </section>
  );
}
