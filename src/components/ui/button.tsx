import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "surface" | "ghost" | "inverse";
type Size = "sm" | "md" | "lg";

const base =
  "group inline-flex items-center justify-center gap-2 rounded-xl font-bold whitespace-nowrap transition-all duration-300 disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-[0_10px_30px_rgba(248,129,45,0.28)] hover:-translate-y-0.5 hover:bg-primary-strong hover:shadow-[0_16px_40px_rgba(248,129,45,0.36)] active:translate-y-0",
  outline:
    "border border-primary/45 text-primary hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10",
  surface:
    "border border-border bg-card text-foreground hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary",
  ghost: "text-muted-foreground hover:text-foreground",
  // For use on top of the orange accent.
  inverse:
    "bg-white text-primary shadow-[0_12px_32px_rgba(0,0,0,0.22)] hover:-translate-y-0.5 hover:bg-white/90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-[52px] px-7 text-[15px]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & ComponentProps<"button">) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </Link>
  );
}
