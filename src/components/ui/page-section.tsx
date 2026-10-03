import type { ElementType, ReactNode } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { cn } from "@/lib/utils";

type Tone = "base" | "raised" | "warm";

const tones: Record<Tone, string> = {
  base: "shell-section",
  raised: "shell-section-raised",
  warm: "shell-section-warm",
};

const rhythm = {
  sm: "py-14 md:py-16",
  md: "py-16 md:py-24 lg:py-28",
  lg: "py-20 md:py-28 lg:py-32",
};

/**
 * Full-width section shell. The background always spans the whole
 * viewport; only the inner `PageContainer` is width-constrained.
 */
export function PageSection({
  as: Tag = "section",
  id,
  tone = "base",
  spacing = "md",
  width = "default",
  bleed = true,
  className,
  innerClassName,
  children,
}: {
  as?: ElementType;
  id?: string;
  tone?: Tone;
  spacing?: keyof typeof rhythm;
  width?: "default" | "narrow" | "wide" | "full";
  /** Adds the decorative ambient orange bloom. */
  bleed?: boolean;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      id={id}
      className={cn(
        "relative w-full",
        tones[tone],
        rhythm[spacing],
        className,
      )}
    >
      {bleed ? (
        <>
          <div
            aria-hidden
            className="bloom -left-40 top-1/4 size-[30rem] opacity-[0.10]"
            style={{ background: "var(--primary)" }}
          />
          <div
            aria-hidden
            className="bloom -right-48 bottom-0 size-[34rem] opacity-[0.07]"
            style={{ background: "var(--primary)" }}
          />
        </>
      ) : null}

      <PageContainer width={width} className={cn("relative", innerClassName)}>
        {children}
      </PageContainer>
    </Tag>
  );
}
