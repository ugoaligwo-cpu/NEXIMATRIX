import {
  ArrowRight,
  BadgeCheck,
  ChartColumn,
  Clock3,
  Globe2,
  LockKeyhole,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { SectionBadge } from "@/components/ui/section-badge";
import { AnimatedNumber } from "@/components/marketing/animated-number";
import { siteConfig } from "@/config/site";

const statCards = [
  {
    label: "Total Deposited",
    icon: Wallet,
    value: (
      <>
        {siteConfig.currencySymbol}
        <AnimatedNumber value={siteConfig.totalDeposit} duration={2200} />
      </>
    ),
  },
  {
    label: "Total Earnings",
    icon: TrendingUp,
    value: (
      <>
        {siteConfig.currencySymbol}
        <AnimatedNumber value={siteConfig.totalEarning} duration={2400} />
      </>
    ),
  },
  {
    label: "Happy Investors",
    icon: Users,
    value: (
      <AnimatedNumber
        value={siteConfig.totalUsers}
        duration={2200}
        suffix="+"
      />
    ),
  },
  {
    label: "Countries Served",
    icon: Globe2,
    value: <AnimatedNumber value={50} duration={1800} suffix="+" />,
  },
];

const trustItems = [
  { icon: LockKeyhole, label: "SSL Secured" },
  { icon: BadgeCheck, label: "Verified Platform" },
  { icon: Clock3, label: "24/7 Support" },
];

export function HomeHero() {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Ambient lighting */}
      <div aria-hidden className="hero-glow absolute inset-0" />
      <div
        aria-hidden
        className="grid-overlay absolute inset-0 opacity-70"
      />
      <div
        aria-hidden
        className="float-slow bloom -right-40 top-16 size-[30rem] opacity-25"
        style={{ background: "var(--primary)" }}
      />
      <div
        aria-hidden
        className="bloom -left-40 bottom-0 size-[26rem] opacity-15"
        style={{ background: "#b45309" }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--shell)] to-transparent"
      />

      <PageContainer className="relative flex min-h-[calc(100svh-88px)] flex-col items-center justify-center gap-14 py-16 md:py-20 lg:flex-row lg:items-center lg:gap-16 lg:py-24">
        {/* Left: copy + actions */}
        <div className="reveal-up flex w-full max-w-xl flex-1 flex-col items-center gap-6 text-center lg:items-start lg:text-left">
          <SectionBadge icon={Zap}>
            Trusted by{" "}
            <span className="font-extrabold">
              {siteConfig.totalUsers.toLocaleString()}+
            </span>{" "}
            investors
          </SectionBadge>

          <h1 className="text-[clamp(2.25rem,1.3rem+3.9vw,4rem)] font-extrabold leading-[1.06] tracking-[-0.045em] text-balance">
            {siteConfig.heroText}
          </h1>

          <p className="max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-base md:leading-8 md:text-[17px]">
            {siteConfig.heroDescription}
          </p>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center lg:justify-start">
            <a
              href="/register"
              className="group inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 text-[15px] font-bold text-white shadow-[0_12px_34px_rgba(248,129,45,0.32)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-strong hover:shadow-[0_18px_44px_rgba(248,129,45,0.4)] sm:w-auto"
            >
              Start Investing
              <ArrowRight
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </a>
            <a
              href="/invest-plans"
              className="inline-flex h-[52px] w-full items-center justify-center rounded-xl border border-primary/40 bg-primary/[0.06] px-8 text-[15px] font-bold text-primary transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10 sm:w-auto"
            >
              View Plans
            </a>
          </div>

          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 pt-1 text-sm text-muted-foreground lg:justify-start">
            {trustItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label} className="flex items-center gap-1.5">
                  <Icon size={16} className="text-primary" />
                  <span>{item.label}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right: composed financial dashboard */}
        <div className="reveal-up delay-2 w-full max-w-xl flex-1">
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-6 rounded-[2rem] opacity-25 blur-3xl"
              style={{ background: "var(--primary)" }}
            />

            <div className="ui-card relative overflow-hidden rounded-3xl p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:p-6">
              {/* Window chrome */}
              <div className="flex items-center justify-between gap-3 border-b border-line pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-success" />
                  </span>
                  <p className="text-sm font-bold">Live Platform Stats</p>
                </div>
                <ChartColumn size={18} className="text-muted-foreground" />
              </div>

              {/* Primary balance strip */}
              <div className="mt-5 flex items-end justify-between gap-4 rounded-2xl bg-primary/[0.09] p-5 ring-1 ring-inset ring-primary/20">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Portfolio Value
                  </p>
                  <p className="mt-2 text-3xl font-extrabold tracking-[-0.04em] sm:text-[2.6rem]">
                    {siteConfig.currencySymbol}
                    <AnimatedNumber value={28460} duration={2200} />
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-1 text-xs font-extrabold text-success">
                  <TrendingUp size={13} /> +18.4%
                </span>
              </div>

              {/* Stat grid */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                {statCards.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-line bg-surface-2/60 p-4 transition-colors duration-300 hover:border-primary/25"
                    >
                      <span className="grid size-9 place-items-center rounded-xl bg-primary/12 text-primary">
                        <Icon size={18} />
                      </span>
                      <p className="mt-3 text-[11px] font-semibold text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="mt-0.5 text-lg font-extrabold tracking-tight">
                        {stat.value}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Growth bar */}
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface-2/60 p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                  <ShieldCheck size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold">Platform Growth</p>
                    <p className="text-sm font-extrabold text-primary">+78%</p>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-[1.8s] ease-out"
                      style={{ width: "78%" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
