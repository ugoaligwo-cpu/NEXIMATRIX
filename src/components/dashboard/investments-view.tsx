"use client";

import { useState, useEffect } from "react";
import { PiggyBank, TrendingUp, Clock, CheckCircle2, Zap } from "lucide-react";
import { phpApi, ApiError, InvestmentPlan, Investment } from "@/lib/php-api";

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface-2/60 px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

export function InvestmentsView() {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [plansResult, invResult] = await Promise.all([
          phpApi.investmentPlans(),
          phpApi.investments({ limit: 50 }),
        ]);
        if (active) {
          setPlans(plansResult.plans);
          setInvestments(invResult.investments.items);
        }
      } catch {
        // silent
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const plan = plans.find((p) => p.id === selectedPlan) ?? null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
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
      await phpApi.createInvestment({ plan_id: selectedPlan, amount: value });
      setSuccess("Investment created successfully.");
      setAmount("");
      setSelectedPlan(null);
      const [plansResult, invResult] = await Promise.all([
        phpApi.investmentPlans(),
        phpApi.investments({ limit: 50 }),
      ]);
      setPlans(plansResult.plans);
      setInvestments(invResult.investments.items);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeInvestments = investments.filter((i) => i.status === "active");
  const totalInvested = activeInvestments.reduce((sum, i) => sum + i.amount, 0);
  const totalProfit = investments.reduce((sum, i) => sum + i.profit_earned, 0);

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Finance</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Investments</h1>
        <p className="mt-2 text-sm text-muted-foreground">Choose a plan and start earning daily returns.</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Active Plans</p>
          <p className="mt-1 text-2xl font-extrabold text-primary">{activeInvestments.length}</p>
        </div>
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Total Invested</p>
          <p className="mt-1 text-2xl font-extrabold">${totalInvested.toFixed(2)}</p>
        </div>
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Total Profit</p>
          <p className="mt-1 text-2xl font-extrabold text-success">${totalProfit.toFixed(2)}</p>
        </div>
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Completed</p>
          <p className="mt-1 text-2xl font-extrabold">{investments.filter((i) => i.status === "completed").length}</p>
        </div>
      </div>

      {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      {success ? <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p> : null}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-extrabold"><Zap size={18} className="text-primary" /> Investment Plans</h2>
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading plans…</p>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        )}

        {plan ? (
          <form onSubmit={submit} className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-surface-2/30 p-5 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Investment Amount (${plan.min_deposit.toFixed(2)} – ${plan.max_deposit.toFixed(2)})
                <input type="number" min={plan.min_deposit} max={plan.max_deposit} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} mt-1.5`} placeholder={`Min $${plan.min_deposit.toFixed(2)}`} required />
              </label>
            </div>
            <button type="submit" disabled={submitting} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60">
              <PiggyBank size={16} /> {submitting ? "Investing…" : `Invest in ${plan.name}`}
            </button>
          </form>
        ) : null}
      </section>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-extrabold"><TrendingUp size={18} className="text-primary" /> Your Investments</h2>
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading investments…</p>
        ) : investments.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No investments yet. Select a plan above to get started.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="pb-3">Plan</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Daily</th>
                  <th className="pb-3">Profit</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Ends</th>
                </tr>
              </thead>
              <tbody>
                {investments.map((inv) => (
                  <tr key={inv.id} className="border-b border-line/50 last:border-0">
                    <td className="py-3 font-bold">{inv.plan_name}</td>
                    <td className="py-3">${inv.amount.toFixed(2)}</td>
                    <td className="py-3">{inv.daily_return}%</td>
                    <td className="py-3 font-bold text-success">${inv.profit_earned.toFixed(2)}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                        inv.status === "active" ? "bg-success/10 text-success" : inv.status === "completed" ? "bg-primary/10 text-primary" : "bg-danger/10 text-danger"
                      }`}>
                        {inv.status === "active" ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{new Date(inv.ends_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
