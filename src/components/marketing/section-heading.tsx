import type { ReactNode } from "react";
import { SectionBadge } from "@/components/ui/section-badge";
import { cn } from "@/lib/utils";

/**
 * Centered (or left-aligned) eyebrow badge + heading + supporting copy.
 * The shared heading scale for every marketing section.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  icon,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  icon?: React.ComponentProps<typeof SectionBadge>["icon"];
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex max-w-3xl flex-col gap-5",
        align === "center" ? "mx-auto items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow ? <SectionBadge icon={icon}>{eyebrow}</SectionBadge> : null}

      <h2 className="text-[clamp(1.9rem,1.2rem+2.4vw,3.25rem)] font-extrabold leading-[1.1] tracking-[-0.04em] text-balance">
        {title}
      </h2>

      {description ? (
        <p className="max-w-2xl text-[15px] leading-7 text-muted-foreground sm:text-base md:leading-8 md:text-[17px]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
