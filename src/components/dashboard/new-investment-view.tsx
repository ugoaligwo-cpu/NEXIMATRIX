"use client";

import { useState, useEffect } from "react";
import { PiggyBank, TrendingUp, AlertCircle } from "lucide-react";
import { phpApi, ApiError, InvestmentPlan } from "@/lib/php-api";
import { useRouter } from "next/navigation";

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface-2/60 px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

export function NewInvestmentView() {
  const router = useRouter();
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    phpApi.investmentPlans()
      .then((result) => setPlans(result.plans))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const plan = plans.find((p) => p.id === selectedPlan) ?? null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedPlan) {
      setError("Select an investment plan.");
      return;
    }
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setError("Enter a valid investment amount.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await phpApi.createInvestment({ plan_id: selectedPlan, amount: value });
      router.push(`/invest/${result.investment.id}`);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[360px] place-items-center">
        <p className="text-sm text-muted-foreground">Loading plans…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Invest</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">New Investment</h1>
        <p className="mt-2 text-sm text-muted-foreground">Select a plan and amount to start earning daily returns.</p>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setSelectedPlan(p.id); setAmount(""); setError(""); }}
              className={`rounded-2xl border p-5 text-left transition-all ${
                selectedPlan === p.id
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-line hover:border-primary/40 hover:bg-surface-2/50"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{p.duration_days} Days</p>
              <h3 className="mt-1 text-xl font-extrabold">{p.name}</h3>
              <p className="mt-2 text-3xl font-extrabold text-primary">{p.daily_return}%</p>
              <p className="text-xs text-muted-foreground">daily for {p.duration_days} days</p>
              <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                <p>Min: ${p.min_deposit.toFixed(2)}</p>
                <p>Max: ${p.max_deposit.toFixed(2)}</p>
                <p>Total Return: {p.total_return}%</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {plan ? (
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-extrabold"><PiggyBank size={18} className="text-primary" /> Invest in {plan.name}</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl border border-line bg-surface-2/30 p-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Daily Return</p>
              <p className="font-bold text-success">{plan.daily_return}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-bold">{plan.duration_days} days</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Min Deposit</p>
              <p className="font-bold">${plan.min_deposit.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Max Deposit</p>
              <p className="font-bold">${plan.max_deposit.toFixed(2)}</p>
            </div>
          </div>
          <form onSubmit={submit} className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Amount (USD)
                <input type="number" min={plan.min_deposit} max={plan.max_deposit} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} mt-1.5`} placeholder={`Min $${plan.min_deposit.toFixed(2)}`} required />
              </label>
            </div>
            <button type="submit" disabled={submitting} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60">
              <TrendingUp size={16} /> {submitting ? "Processing…" : "Confirm Investment"}
            </button>
          </form>
          {plan ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-warning">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <p>Your invested amount will be deducted from your wallet balance. Daily profits are credited automatically.</p>
            </div>
          ) : null}
        </section>
      ) : (
        <div className="grid min-h-[200px] place-items-center rounded-2xl border border-dashed border-line p-10 text-center">
          <div>
            <PiggyBank size={32} className="mx-auto text-muted-foreground" />
            <p className="mt-3 text-sm font-semibold text-muted-foreground">Select a plan above to configure your investment</p>
          </div>
        </div>
      )}
    </div>
  );
}
