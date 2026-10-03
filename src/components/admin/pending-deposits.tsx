"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle2, XCircle } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

type Deposit = {
  id: number;
  user_id: number;
  amount: number;
  method: string;
  reference: string | null;
  status: string;
  created_at: string;
  username: string;
  full_name: string;
  email: string;
};

export function PendingDeposits() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const limit = 15;

  const load = async () => {
    setLoading(true);
    try {
      const result = await phpApi.adminPendingDeposits({ page, limit });
      setDeposits(result.deposits.items as unknown as Deposit[]);
      setTotal(result.deposits.total);
    } catch {
      setError("Failed to load pending deposits.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const review = async (depositId: number, status: "approved" | "rejected") => {
    setError(""); setSuccess("");
    try {
      await phpApi.adminReviewDeposit({ deposit_id: depositId, status });
      setSuccess(`Deposit ${status}.`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to review deposit.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Transactions</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Pending Deposits</h1>
        <p className="mt-2 text-sm text-muted-foreground">Review and manage pending demo deposit records. No real payments are processed.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>
        ) : deposits.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No pending deposits.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="pb-3">User</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Method</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((d) => (
                    <tr key={d.id} className="border-b border-line/50 last:border-0">
                      <td className="py-3">
                        <p className="font-bold">{d.full_name}</p>
                        <p className="text-xs text-muted-foreground">@{d.username}</p>
                      </td>
                      <td className="py-3 font-bold">${d.amount.toFixed(2)}</td>
                      <td className="py-3 capitalize">{d.method.replace(/_/g, " ")}</td>
                      <td className="py-3 text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                      <td className="py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => review(d.id, "approved")} className="inline-flex items-center gap-1 rounded-lg bg-success px-2.5 py-1 text-xs font-bold text-white hover:opacity-80">
                            <CheckCircle2 size={12} /> Approve
                          </button>
                          <button onClick={() => review(d.id, "rejected")} className="inline-flex items-center gap-1 rounded-lg bg-danger px-2.5 py-1 text-xs font-bold text-white hover:opacity-80">
                            <XCircle size={12} /> Reject
                          </button>
                        </div>
                      </td>
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
