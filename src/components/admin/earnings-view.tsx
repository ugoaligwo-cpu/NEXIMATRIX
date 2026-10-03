"use client";

import { useState, useEffect } from "react";
import { Coins } from "lucide-react";
import { phpApi } from "@/lib/php-api";

type Earning = {
  id: number;
  user_id: number;
  type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  username: string;
  full_name: string;
};

export function EarningsView() {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 15;

  const load = async () => {
    setLoading(true);
    try {
      const result = await phpApi.adminEarnings({ page, limit });
      setEarnings(result.earnings.items as unknown as Earning[]);
      setTotal(result.earnings.total);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Transactions</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Earnings</h1>
        <p className="mt-2 text-sm text-muted-foreground">View simulated earning records. Demo data only — no real financial returns are generated.</p>
      </header>

      <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-warning">
        <Coins size={14} className="shrink-0" />
        <p>All earnings are simulated demo records. No actual financial returns are generated or accrued.</p>
      </div>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading earnings...</p>
        ) : earnings.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No earnings records found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="pb-3">User</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map((e) => (
                    <tr key={e.id} className="border-b border-line/50 last:border-0">
                      <td className="py-3">
                        <p className="font-bold">{e.full_name}</p>
                        <p className="text-xs text-muted-foreground">@{e.username}</p>
                      </td>
                      <td className="py-3 font-bold text-success">${e.amount.toFixed(2)}</td>
                      <td className="py-3 text-muted-foreground">{e.description || "—"}</td>
                      <td className="py-3 text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Page {page} of {totalPages} ({total} records)</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-40">Previous</button>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
