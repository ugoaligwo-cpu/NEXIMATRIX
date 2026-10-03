"use client";

import { useState, useEffect } from "react";
import { ReceiptText, ArrowUpRight, ArrowDownLeft, Coins, Gift, Percent } from "lucide-react";
import { phpApi, Transaction } from "@/lib/php-api";

const typeConfig: Record<string, { icon: typeof ReceiptText; color: string; label: string }> = {
  deposit: { icon: ArrowDownLeft, color: "text-success bg-success/10", label: "Deposit" },
  withdrawal: { icon: ArrowUpRight, color: "text-danger bg-danger/10", label: "Withdrawal" },
  investment: { icon: ReceiptText, color: "text-primary bg-primary/10", label: "Investment" },
  profit: { icon: Coins, color: "text-success bg-success/10", label: "Profit" },
  referral_bonus: { icon: Gift, color: "text-primary bg-primary/10", label: "Referral Bonus" },
  adjustment: { icon: Percent, color: "text-warning bg-warning/10", label: "Adjustment" },
  deposit_fee: { icon: Percent, color: "text-warning bg-warning/10", label: "Fee" },
  withdrawal_fee: { icon: Percent, color: "text-warning bg-warning/10", label: "Fee" },
};

const statusColors: Record<string, string> = {
  completed: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  failed: "bg-danger/10 text-danger",
  cancelled: "bg-muted-foreground/10 text-muted-foreground",
};

export function TransactionsView() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");

  const limit = 15;

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const result = await phpApi.transactions({ page, limit, type: typeFilter || undefined });
        if (active) {
          setTransactions(result.transactions.items);
          setTotal(result.transactions.total);
        }
      } catch {
        // silent
      } finally {
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
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Finance</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Transaction History</h1>
        <p className="mt-2 text-sm text-muted-foreground">All your financial transactions in one place.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setTypeFilter(""); setPage(1); }}
          className={`rounded-full border px-4 py-2 text-xs font-bold transition ${!typeFilter ? "border-primary bg-primary/10 text-primary" : "border-line text-muted-foreground hover:border-primary/40"}`}
        >
          All
        </button>
        {Object.entries(typeConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => { setTypeFilter(key); setPage(1); }}
            className={`rounded-full border px-4 py-2 text-xs font-bold transition ${typeFilter === key ? "border-primary bg-primary/10 text-primary" : "border-line text-muted-foreground hover:border-primary/40"}`}
          >
            {config.label}
          </button>
        ))}
      </div>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading transactions…</p>
        ) : transactions.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No transactions found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Balance After</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => {
                    const config = typeConfig[txn.type] ?? typeConfig.adjustment;
                    const Icon = config.icon;
                    return (
                      <tr key={txn.id} className="border-b border-line/50 last:border-0">
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${config.color}`}>
                            <Icon size={12} />
                            {config.label}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground">{txn.description ?? "—"}</td>
                        <td className="py-3 font-bold">
                          <span className={txn.amount >= 0 ? "text-success" : "text-danger"}>
                            {txn.amount >= 0 ? "+" : ""}{txn.amount.toFixed(2)}
                          </span>
                          {txn.fee > 0 ? <span className="ml-1 text-xs text-muted-foreground">(fee: {txn.fee.toFixed(2)})</span> : null}
                        </td>
                        <td className="py-3 text-muted-foreground">${txn.balance_after.toFixed(2)}</td>
                        <td className="py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusColors[txn.status] ?? "bg-muted-foreground/10 text-muted-foreground"}`}>
                            {txn.status}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground">{new Date(txn.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="mt-5 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} ({total} transactions)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold transition hover:border-primary/40 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold transition hover:border-primary/40 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
