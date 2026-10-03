"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { phpApi, Investment } from "@/lib/php-api";

export function InvestmentDetailView() {
  const params = useParams();
  const id = Number(params.id);

  const [investment, setInvestment] = useState<Investment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [remaining, setRemaining] = useState(0);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!id || isNaN(id)) {
        setError("Invalid investment ID.");
        setLoading(false);
        return;
      }
      try {
        const result = await phpApi.investments({ limit: 100 });
        const found = result.investments.items.find((i) => i.id === id);
        if (active && mountedRef.current) {
          if (found) {
            setInvestment(found);
            const start = new Date(found.starts_at).getTime();
            const end = new Date(found.ends_at).getTime();
            const now = Date.now();
            setProgress(Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)));
            setRemaining(Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24))));
          } else {
            setError("Investment not found.");
          }
        }
      } catch {
        if (active && mountedRef.current) setError("Failed to load investment.");
      } finally {
        if (active && mountedRef.current) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="grid min-h-[360px] place-items-center">
        <p className="text-sm text-muted-foreground">Loading investment…</p>
      </div>
    );
  }

  if (error || !investment) {
    return (
      <div className="grid min-h-[360px] place-items-center">
        <div className="text-center">
          <p className="text-sm font-semibold text-danger">{error ?? "Investment not found."}</p>
          <Link href="/invest" className="mt-3 inline-block text-sm font-bold text-primary hover:underline">
            ← Back to investments
          </Link>
        </div>
      </div>
    );
  }

  const expectedTotal = investment.amount * (1 + investment.total_return / 100);

  return (
    <div className="flex flex-col gap-7">
      <header>
        <Link href="/invest" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground transition hover:text-primary">
          <ArrowLeft size={14} /> Back to Investments
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Investment #{investment.id}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{investment.plan_name}</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="ui-card rounded-2xl p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Invested</p>
          <p className="mt-1 text-xl font-extrabold">${investment.amount.toFixed(2)}</p>
        </div>
        <div className="ui-card rounded-2xl p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Daily Return</p>
          <p className="mt-1 text-xl font-extrabold text-primary">{investment.daily_return}%</p>
        </div>
        <div className="ui-card rounded-2xl p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Profit Earned</p>
          <p className="mt-1 text-xl font-extrabold text-success">${investment.profit_earned.toFixed(2)}</p>
        </div>
        <div className="ui-card rounded-2xl p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Expected Total</p>
          <p className="mt-1 text-xl font-extrabold">${expectedTotal.toFixed(2)}</p>
        </div>
      </div>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Progress</h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
              investment.status === "active"
                ? "bg-success/10 text-success"
                : "bg-primary/10 text-primary"
            }`}
          >
            {investment.status}
          </span>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-success transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          <span>{remaining} days remaining</span>
          <span>{progress.toFixed(1)}% elapsed</span>
        </div>
      </section>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">Details</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/30 p-4">
            <Calendar size={18} className="text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="font-bold">{new Date(investment.starts_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/30 p-4">
            <Clock size={18} className="text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">End Date</p>
              <p className="font-bold">{new Date(investment.ends_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/30 p-4">
            <DollarSign size={18} className="text-success" />
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="font-bold">{investment.duration_days} days</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/30 p-4">
            <TrendingUp size={18} className="text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">Total Return</p>
              <p className="font-bold">{investment.total_return}%</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
