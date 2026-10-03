import { ArrowUpRight, CalendarDays, Gift, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { InvestmentPlan } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

const shortLabels: Record<string, string> = {
  Basic: "BA",
  Premium: "PR",
  Grand: "GR",
};

const palettes: Record<string, { ring: string; glow: string }> = {
  basic: { ring: "rgba(248,129,45,0.22)", glow: "rgba(248,129,45,0.10)" },
  premium: { ring: "rgba(249,146,60,0.28)", glow: "rgba(249,146,60,0.12)" },
  grand: { ring: "rgba(251,191,36,0.30)", glow: "rgba(251,191,36,0.12)" },
};

export function PlanCard({ plan }: { plan: InvestmentPlan }) {
  const palette = palettes[plan.id] ?? palettes.basic;
  const daily = plan.projectedReturn / plan.duration;

  const rows = [
    { icon: TrendingUp, label: "Daily Profit", value: `${daily.toFixed(2)}%` },
    { icon: CalendarDays, label: "Duration", value: `${plan.duration} Days` },
    {
      icon: Gift,
      label: "Referral Bonus",
      value: plan.referralBonus > 0 ? `${plan.referralBonus}%` : "—",
    },
  ];

  return (
    <article className="ui-card ui-card-hover group relative flex h-full w-full flex-col overflow-hidden rounded-2xl p-6 md:p-7">
      {/* Featured marker */}
      {plan.referralBonus >= 10 ? (
        <span className="absolute right-5 top-5 rounded-full bg-primary px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white">
          Popular
        </span>
      ) : null}

      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: palette.glow }}
      />

      <header className="relative flex items-center gap-3.5">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-primary"
          style={{ background: palette.glow, boxShadow: `inset 0 0 0 1px ${palette.ring}` }}
        >
          {shortLabels[plan.name] ?? plan.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-extrabold uppercase tracking-wide">
            {plan.name}
          </h3>
          <p className="text-xs font-medium text-muted-foreground">
            {plan.eyebrow}
          </p>
        </div>
      </header>

      {/* ROI hero */}
      <div
        className="relative mt-6 rounded-2xl p-5 text-center"
        style={{ background: palette.glow, boxShadow: `inset 0 0 0 1px ${palette.ring}` }}
      >
        <p className="text-4xl font-extrabold tracking-[-0.045em] text-primary">
          {plan.projectedReturn}%
        </p>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Total ROI
        </p>
      </div>

      {/* Metrics */}
      <dl className="relative mt-6 flex flex-col gap-3.5">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <dt className="flex items-center gap-2 text-muted-foreground">
                <Icon size={15} className="text-primary" />
                {row.label}
              </dt>
              <dd className="font-bold">{row.value}</dd>
            </div>
          );
        })}
      </dl>

      <div aria-hidden className="my-6 border-t border-dashed border-line" />

      {/* Limits */}
      <div className="relative mt-auto flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Min. Invest
          </p>
          <p className="mt-1 text-lg font-extrabold">
            {formatCurrency(plan.min, { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Max. Invest
          </p>
          <p className="mt-1 text-lg font-extrabold">
            {formatCurrency(plan.max, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <Link
        href={`/invest/new?plan=${plan.id}`}
        className="relative mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/[0.07] text-sm font-bold text-primary transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-white"
      >
        Invest in {plan.name}
        <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </article>
  );
}
