"use client";

import { useState, useEffect } from "react";
import { Search, AlertTriangle } from "lucide-react";
import { phpApi } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

type RecordItem = {
  id: number;
  user_id: number;
  type: string;
  amount: string;
  fee: string;
  balance_before: string;
  balance_after: string;
  description: string | null;
  status: string;
  created_at: string;
};

export function RecordsView() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const limit = 20;

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const result = await phpApi.adminRecords({ type: typeFilter || undefined, page, limit });
        if (active) {
          setRecords(result.records.items as unknown as RecordItem[]);
          setTotal(result.records.total);
        }
      } catch { /* silent */ } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [page, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Records</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Transaction History</h1>
        <p className="mt-2 text-sm text-muted-foreground">Read-only demonstration view. No real financial transactions are processed.</p>
      </header>

      <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-warning">
        <AlertTriangle size={14} className="shrink-0" />
        <p>Demonstration data only. These records do not represent real financial activity.</p>
      </div>

      <div className="flex gap-3">
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className={inputClass}>
          <option value="">All Types</option>
          <option value="deposit">Deposits</option>
          <option value="withdrawal">Withdrawals</option>
          <option value="investment">Investments</option>
          <option value="profit">Profits</option>
          <option value="referral_bonus">Referral Bonuses</option>
          <option value="adjustment">Adjustments</option>
        </select>
      </div>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading records...</p>
        ) : records.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No records found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="pb-3">ID</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Balance After</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b border-line/50 last:border-0">
                      <td className="py-3">#{r.id}</td>
                      <td className="py-3 capitalize">{r.type.replace(/_/g, " ")}</td>
                      <td className="py-3 font-bold">${parseFloat(r.amount).toFixed(2)}</td>
                      <td className="py-3 text-muted-foreground">${parseFloat(r.balance_after).toFixed(2)}</td>
                      <td className="py-3">
                        <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold capitalize text-success">{r.status}</span>
                      </td>
                      <td className="py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages} ({total} records)</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-40">Previous</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
