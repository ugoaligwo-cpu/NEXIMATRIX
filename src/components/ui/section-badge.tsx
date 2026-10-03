import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Small rounded orange-outline label used above section headings.
 * Matches the reference site's `[ Investment Plans ]` pill treatment.
 */
export function SectionBadge({
  children,
  icon: Icon,
  className,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.07] px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary",
        className,
      )}
    >
      {Icon ? <Icon className="size-3.5" strokeWidth={2.4} /> : null}
      {children}
    </span>
  );
}
