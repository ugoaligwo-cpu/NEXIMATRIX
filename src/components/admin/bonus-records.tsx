"use client";

import { useState, useEffect, useCallback } from "react";
import { Gift, Plus } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

type BonusRecord = {
  id: number;
  user_id: number;
  amount: number;
  reason: string;
  created_at: string;
  username: string;
  full_name: string;
};

export function BonusRecords() {
  const [records, setRecords] = useState<BonusRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await phpApi.adminBonusRecords({ page, limit });
      setRecords(result.records.items as unknown as BonusRecord[]);
      setTotal(result.records.total);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const award = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      await phpApi.adminAwardBonus({
        user_id: Number(userId),
        amount: parseFloat(amount),
        reason,
      });
      setSuccess("Bonus awarded.");
      setUserId(""); setAmount(""); setReason("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to award bonus.");
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Transactions</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Add Bonus</h1>
          <p className="mt-2 text-sm text-muted-foreground">Award demo bonuses to users. All bonuses are simulated and have no cash value.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90">
          <Plus size={16} /> Award Bonus
        </button>
      </header>

      <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-warning">
        <Gift size={14} className="shrink-0" />
        <p>All bonuses are non-cash demo records. Demo points have no monetary value and cannot be redeemed or withdrawn.</p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      {showForm && (
        <form onSubmit={award} className="ui-card flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Award Demo Bonus</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              User ID
              <input type="number" value={userId} onChange={(e) => setUserId(e.target.value)} className={`${inputClass} mt-1.5`} required min="1" />
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Amount
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} mt-1.5`} required min="0.01" />
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Reason
              <input value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputClass} mt-1.5`} required minLength={3} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-muted-foreground">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Awarding..." : "Award Bonus"}</button>
          </div>
        </form>
      )}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>
        ) : records.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No bonus records yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="pb-3">User</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Reason</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b border-line/50 last:border-0">
                      <td className="py-3">
                        <p className="font-bold">{r.full_name}</p>
                        <p className="text-xs text-muted-foreground">@{r.username}</p>
                      </td>
                      <td className="py-3 font-bold text-success">${Number(r.amount).toFixed(2)}</td>
                      <td className="py-3 text-muted-foreground">{r.reason}</td>
                      <td className="py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
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
