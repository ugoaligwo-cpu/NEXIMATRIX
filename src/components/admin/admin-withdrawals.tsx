"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, Search } from "lucide-react";
import { phpApi, ApiError, Withdrawal } from "@/lib/php-api";

type WithdrawalWithUser = Withdrawal & { username: string; full_name: string; email: string };

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

export function AdminWithdrawalsView() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const limit = 15;

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const result = await phpApi.adminWithdrawals({ page, limit, status: statusFilter || undefined });
        if (active) {
          setWithdrawals(result.withdrawals.items);
          setTotal(result.withdrawals.total);
        }
      } catch {
        if (active) setError("Failed to load withdrawals.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [page, statusFilter]);

  const review = async (withdrawalId: string, status: "approved" | "rejected" | "paid") => {
    setError("");
    setSuccess("");
    try {
      await phpApi.adminReviewWithdrawal({ withdrawal_id: Number(withdrawalId), status, note: note || undefined });
      setSuccess(`Withdrawal ${status}.`);
      setReviewing(null);
      setNote("");
      const result = await phpApi.adminWithdrawals({ page, limit, status: statusFilter || undefined });
      setWithdrawals(result.withdrawals.items);
      setTotal(result.withdrawals.total);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to review withdrawal.");
    }
  };

  const filtered = withdrawals.filter((w) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return w.username.toLowerCase().includes(q) || w.full_name.toLowerCase().includes(q) || w.email.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Administration</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Withdrawal Requests</h1>
        <p className="mt-2 text-sm text-muted-foreground">Review and process withdrawal requests.</p>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      {success ? <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputClass} pl-9`} placeholder="Search by name, username, or email" />
        </label>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={inputClass}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading withdrawals…</p>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No withdrawals found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="pb-3">User</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Fee</th>
                    <th className="pb-3">Net</th>
                    <th className="pb-3">Method</th>
                    <th className="pb-3">Wallet</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((w) => (
                    <tr key={w.id} className="border-b border-line/50 last:border-0 align-top">
                      <td className="py-3">
                        <p className="font-bold">{w.full_name}</p>
                        <p className="text-xs text-muted-foreground">@{w.username}</p>
                      </td>
                      <td className="py-3 font-bold">${w.amount.toFixed(2)}</td>
                      <td className="py-3 text-muted-foreground">${w.fee.toFixed(2)}</td>
                      <td className="py-3 font-bold">${w.net_amount.toFixed(2)}</td>
                      <td className="py-3 capitalize">{w.method.replace(/_/g, " ")}</td>
                      <td className="py-3 max-w-[120px] truncate text-muted-foreground" title={w.wallet_address}>{w.wallet_address}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                          w.status === "paid" ? "bg-success/10 text-success" :
                          w.status === "approved" ? "bg-primary/10 text-primary" :
                          w.status === "rejected" ? "bg-danger/10 text-danger" :
                          "bg-warning/10 text-warning"
                        }`}>
                          {w.status === "paid" ? <CheckCircle2 size={12} /> : w.status === "rejected" ? <XCircle size={12} /> : <Clock size={12} />}
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</td>
                      <td className="py-3">
                        {w.status === "pending" ? (
                          reviewing === Number(w.id) ? (
                            <div className="flex flex-col gap-2">
                              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-8 w-32 rounded-lg border border-line bg-surface-2/60 px-2 text-xs" />
                              <div className="flex flex-wrap gap-1.5">
                                <button onClick={() => review(String(w.id), "approved")} className="rounded-lg bg-success px-2.5 py-1 text-xs font-bold text-white hover:opacity-80">Approve</button>
                                <button onClick={() => review(String(w.id), "paid")} className="rounded-lg bg-primary px-2.5 py-1 text-xs font-bold text-white hover:opacity-80">Mark Paid</button>
                                <button onClick={() => review(String(w.id), "rejected")} className="rounded-lg bg-danger px-2.5 py-1 text-xs font-bold text-white hover:opacity-80">Reject</button>
                                <button onClick={() => setReviewing(null)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-muted-foreground hover:border-primary/40">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setReviewing(Number(w.id))} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-primary transition hover:border-primary/40">
                              Review
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{total} total withdrawals</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold transition hover:border-primary/40 disabled:opacity-40">Previous</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page * limit >= total} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold transition hover:border-primary/40 disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
