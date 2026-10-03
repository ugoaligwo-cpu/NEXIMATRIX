import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Width = "default" | "narrow" | "wide" | "full";

const widths: Record<Width, string> = {
  narrow: "container-narrow",
  default: "container-shell",
  wide: "mx-auto w-[92%] max-w-[1440px]",
  full: "full-bleed",
};

/**
 * Centered, width-constrained content wrapper.
 * Always place it inside a full-width section so the section background
 * still spans edge to edge.
 */
export function PageContainer({
  as: Tag = "div",
  width = "default",
  className,
  children,
}: {
  as?: ElementType;
  width?: Width;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={cn(widths[width], className)}>
      {children}
    </Tag>
  );
}
