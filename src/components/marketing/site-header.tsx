"use client";

import {
  ArrowRight,
  ChevronRight,
  CircleHelp,
  House,
  Menu,
  PhoneCall,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PageContainer } from "@/components/ui/page-container";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const mobileItems = [
  { label: "Home", href: "/", icon: House },
  { label: "Investment Plans", href: "/invest-plans", icon: ArrowRight },
  { label: "How it works", href: "/how-it-works", icon: ChevronRight },
  { label: "Help", href: "/help", icon: CircleHelp },
  { label: "About", href: "/about", icon: ArrowRight },
  { label: "Contact", href: "/contact", icon: PhoneCall },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-[60] w-full border-b transition-colors duration-300",
          scrolled
            ? "border-line bg-[#08080a]/85 backdrop-blur-xl"
            : "border-transparent bg-[#08080a]/55 backdrop-blur-md",
        )}
      >
        {/* Three-column grid. Below `lg` the nav simply centers inside the
            middle 1fr track; at `lg`+ it becomes absolutely centered so it
            stays optically centered no matter how wide the actions get. */}
        <PageContainer
          width="wide"
          className="relative grid h-[76px] grid-cols-[auto_1fr_auto] items-center gap-4 lg:h-[88px]"
        >
          <div className="flex items-center">
            <Logo showWordmark />
          </div>

          <nav className="hidden justify-center lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:flex">
            <ul className="flex items-center gap-0.5 xl:gap-2">
              {siteConfig.nav.map((item) => {
                const isActive = active(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "relative block rounded-lg px-3 py-2 text-[15px] font-semibold transition-colors duration-200 xl:text-[16px]",
                        isActive
                          ? "text-primary"
                          : "text-white/70 hover:text-white",
                      )}
                    >
                      {item.label}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-x-3 bottom-1 h-[2px] rounded-full bg-primary transition-all duration-300",
                          isActive ? "opacity-100" : "scale-x-0 opacity-0",
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center justify-end gap-2.5">
            <div className="hidden items-center gap-2.5 lg:flex">
              <Link
                href="/login"
                className="rounded-xl border border-white/18 bg-white/[0.03] px-5 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:border-primary/50 hover:bg-primary/10"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-strong hover:shadow-[0_12px_30px_rgba(248,129,45,0.35)]"
              >
                Get Started
              </Link>
              <ThemeToggle variant="onDark" />
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <ThemeToggle variant="onDark" />
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="grid size-10 place-items-center rounded-xl border border-primary/45 bg-primary/10 text-white"
                aria-label="Open navigation"
                aria-expanded={open}
              >
                <Menu className="size-5" />
              </button>
            </div>
          </div>
        </PageContainer>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-[80] lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <aside
          className={cn(
            "absolute right-0 top-0 flex h-full w-[min(88%,380px)] flex-col border-l border-line bg-[#0a0a0c] p-5 text-white shadow-2xl transition-transform duration-300",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between">
            <Logo showWordmark />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid size-10 place-items-center rounded-xl border border-primary/45 bg-primary/10"
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-1.5 overflow-y-auto">
            {mobileItems.map((item) => {
              const Icon = item.icon;
              const isActive = active(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-4 rounded-xl border border-transparent px-3.5 py-3 text-white/75 transition-colors",
                    isActive
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "hover:border-line hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="size-[18px]" />
                    <span className="text-[15px] font-semibold">{item.label}</span>
                  </span>
                  <ChevronRight className="size-4 opacity-50" />
                </Link>
              );
            })}

            <div className="mt-auto flex flex-col gap-2.5 pt-8">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/18 text-sm font-bold text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-white"
              >
                Get Started
              </Link>
            </div>
          </nav>
        </aside>
      </div>
    </>
  );
}
