"use client";

import { useState, useEffect } from "react";
import { Clock, Search } from "lucide-react";
import { phpApi } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

type Investment = {
  id: number;
  user_id: number;
  plan_id: number;
  amount: number;
  daily_return: number;
  duration_days: number;
  total_return: number;
  profit_earned: number;
  starts_at: string;
  ends_at: string;
  status: string;
  username: string;
  full_name: string;
  plan_name: string;
};

export function ExpiringDeposits() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const result = await phpApi.adminExpiringDeposits(days);
      setInvestments(result.investments as unknown as Investment[]);
    } catch {
      setError("Failed to load expiring deposits.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days]);

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Plans</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Expiring Deposits</h1>
        <p className="mt-2 text-sm text-muted-foreground">View simulated investment records approaching their end date. Demo data only.</p>
      </header>

      <div className="flex items-center gap-3">
        <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          Days Until Expiry
          <input type="number" min="1" max="90" value={days} onChange={(e) => setDays(Number(e.target.value))} className={`${inputClass} ml-2 w-24`} />
        </label>
      </div>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>
        ) : investments.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No expiring deposits in the next {days} days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Plan</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">End Date</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {investments.map((inv) => (
                  <tr key={inv.id} className="border-b border-line/50 last:border-0">
                    <td className="py-3">
                      <p className="font-bold">{inv.full_name}</p>
                      <p className="text-xs text-muted-foreground">@{inv.username}</p>
                    </td>
                    <td className="py-3">{inv.plan_name}</td>
                    <td className="py-3 font-bold">${inv.amount.toFixed(2)}</td>
                    <td className="py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(inv.ends_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-bold text-warning">
                        {inv.status}
                      </span>
                    </td>
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
