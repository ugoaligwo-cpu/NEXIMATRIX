import { ChevronDown, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/page-container";
import { Logo } from "@/components/ui/logo";
import { NewsletterForm } from "@/components/marketing/newsletter-form";
import { siteConfig } from "@/config/site";

const solutions = [
  { label: "Investment Plans", href: "/invest-plans" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Help Center", href: "/help" },
  { label: "Privacy Policy", href: "/privacy-policy" },
];

const company = [
  { label: "About Us", href: "/about" },
  { label: "Contact Us", href: "/contact" },
  { label: "Sign in", href: "/login" },
  { label: "Get Started", href: "/register" },
];

const linkClass =
  "group inline-flex items-center gap-1.5 text-sm text-white/85 transition-colors hover:text-white";

export function SiteFooter() {
  return (
    <footer className="relative w-full overflow-hidden bg-primary text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 12% 0%, rgba(255,255,255,0.18), transparent 60%), radial-gradient(ellipse 60% 70% at 92% 100%, rgba(120,45,0,0.35), transparent 62%)",
        }}
      />

      <PageContainer className="relative grid grid-cols-1 gap-12 py-16 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8 lg:py-20">
        <div className="flex flex-col gap-5 lg:col-span-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/25">
            <Logo compact href="/" />
          </span>
          <p className="max-w-sm text-sm leading-relaxed text-white/90">
            {siteConfig.name} is a secure and reliable platform for building
            wealth online. Choose from flexible investment plans, fund your
            account in minutes, and track every payout from one dashboard.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/20">
              <ShieldCheck className="size-3.5" /> SSL Secured
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/20">
              <TrendingUp className="size-3.5" /> Daily Profits
            </span>
          </div>
        </div>

        <nav className="flex flex-col gap-3.5 lg:col-span-2">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">
            Solutions
          </h2>
          {solutions.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>

        <nav className="flex flex-col gap-3.5 lg:col-span-2">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">
            Company
          </h2>
          {company.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">
            Newsletter
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-white/90">
            Subscribe for platform updates, exclusive offers, and investment
            insights.
          </p>
          <NewsletterForm />
        </div>
      </PageContainer>

      <div className="relative border-t border-white/25">
        <PageContainer className="flex flex-col items-start justify-between gap-5 py-6 sm:flex-row sm:items-center">
          <p className="text-xs text-white/85">
            © {new Date().getFullYear()} {siteConfig.name}. All Rights Reserved.
          </p>

          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <label className="relative block">
              <span className="sr-only">Select Language</span>
              <select className="h-10 w-52 appearance-none rounded-lg border border-white/40 bg-white px-4 pr-10 text-sm text-[#333] outline-none">
                <option>Select Language</option>
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#333]"
              />
            </label>
            <span className="text-[11px] text-white/75">Powered by</span>
            <span className="text-[11px] font-bold">Google Translate</span>
          </div>
        </PageContainer>
      </div>
    </footer>
  );
}
