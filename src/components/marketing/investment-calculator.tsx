"use client";

import { Calculator, Check, Coins, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { plans } from "@/lib/data";
import { siteConfig } from "@/config/site";
import { cn, formatCurrency } from "@/lib/utils";

export function InvestmentCalculator() {
  const [selectedId, setSelectedId] = useState(plans[0].id);
  const [amount, setAmount] = useState(plans[0].min);
  const plan = plans.find((item) => item.id === selectedId) ?? plans[0];

  const values = useMemo(() => {
    const total = amount * (plan.projectedReturn / 100);
    return { total, daily: total / plan.duration };
  }, [amount, plan.duration, plan.projectedReturn]);

  const rangeProgress =
    ((amount - plan.min) / Math.max(plan.max - plan.min, 1)) * 100;

  const selectPlan = (id: string) => {
    const next = plans.find((item) => item.id === id);
    setSelectedId(id);
    if (next) setAmount(next.min);
  };

  return (
    <div className="ui-card overflow-hidden rounded-3xl">
      <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr]">
        {/* Left: inputs */}
        <div className="flex flex-col gap-7 p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-3.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
              <Calculator size={20} />
            </span>
            <div>
              <h3 className="text-lg font-extrabold tracking-tight">
                Investment Calculator
              </h3>
              <p className="text-xs text-muted-foreground">
                Estimate your potential returns
              </p>
            </div>
          </div>

          <fieldset className="flex flex-col gap-2.5">
            <legend className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Choose Plan
            </legend>
            <div className="flex flex-wrap gap-2">
              {plans.map((item) => {
                const isActive = plan.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectPlan(item.id)}
                    aria-pressed={isActive}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all duration-300",
                      isActive
                        ? "border-primary bg-primary text-white shadow-[0_10px_26px_rgba(248,129,45,0.3)]"
                        : "border-line text-muted-foreground hover:-translate-y-0.5 hover:border-primary/45 hover:text-primary",
                    )}
                  >
                    {item.name}
                    {isActive ? <Check size={14} /> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="public-investment-amount"
              className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground"
            >
              Investment Amount ({siteConfig.currencyCode})
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                {siteConfig.currencySymbol}
              </span>
              <input
                id="public-investment-amount"
                type="number"
                inputMode="numeric"
                value={amount}
                min={plan.min}
                max={plan.max}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setAmount(
                    Number.isFinite(next)
                      ? Math.min(Math.max(next, plan.min), plan.max)
                      : plan.min,
                  );
                }}
                className="h-12 w-full rounded-xl border border-line bg-surface-2/60 pl-9 pr-4 text-[15px] font-bold outline-none transition-colors focus:border-primary"
              />
            </div>
          </div>

          <div className="flex w-full flex-col gap-2">
            <input
              type="range"
              min={plan.min}
              max={plan.max}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              className="range-primary h-2 w-full cursor-pointer appearance-none rounded-full"
              style={{
                background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${rangeProgress}%, var(--surface-3) ${rangeProgress}%, var(--surface-3) 100%)`,
              }}
              aria-label="Investment amount"
            />
            <div className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>
                {siteConfig.currencySymbol}
                {plan.min}
              </span>
              <span className="rounded-full border border-line px-2.5 py-0.5 text-foreground">
                {plan.duration} Days
              </span>
              <span>
                {siteConfig.currencySymbol}
                {plan.max}
              </span>
            </div>
          </div>
        </div>

        {/* Right: result panel */}
        <div
          className="relative flex flex-col justify-between gap-8 overflow-hidden p-6 sm:p-8 lg:p-10"
          style={{
            background:
              "linear-gradient(150deg, color-mix(in srgb, var(--primary) 34%, transparent), color-mix(in srgb, var(--primary) 10%, transparent) 70%)",
          }}
        >
          <div
            aria-hidden
            className="bloom -right-16 -top-16 size-56 opacity-30"
            style={{ background: "var(--primary)" }}
          />

          <div className="relative">
            <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-white/75">
              Projected Returns
            </h4>

            <div className="mt-6 flex flex-col gap-5">
              <div className="flex items-start gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/12">
                  <TrendingUp size={18} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-white/70">
                    Daily Profit
                  </p>
                  <p className="text-2xl font-extrabold tracking-tight">
                    {formatCurrency(values.daily)}
                  </p>
                </div>
              </div>

              <div aria-hidden className="border-t border-white/15" />

              <div className="flex items-start gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/12">
                  <Coins size={18} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-white/70">
                    Total Profit
                  </p>
                  <p className="text-[2rem] font-extrabold leading-tight tracking-[-0.04em]">
                    {formatCurrency(values.total)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative rounded-2xl bg-black/20 p-5 ring-1 ring-inset ring-white/15 backdrop-blur-sm">
            <p className="text-xs font-semibold text-white/70">
              Total after {plan.duration} days
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-[-0.04em]">
              {formatCurrency(amount + values.total)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
