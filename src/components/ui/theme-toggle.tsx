"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className = "",
  variant = "surface",
}: {
  className?: string;
  variant?: "surface" | "onDark";
}) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-xl border transition-all duration-300 hover:-translate-y-0.5",
        variant === "surface"
          ? "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
          : "border-white/15 bg-white/[0.03] text-white/70 hover:border-primary/45 hover:text-primary",
        className,
      )}
      aria-label="Toggle color theme"
    >
      <Sun className="size-[18px] dark:hidden" />
      <Moon className="hidden size-[18px] text-white dark:block" />
    </button>
  );
}
