"use client";

import { useState, useEffect } from "react";
import { Send, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface-2/60 px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

const methodOptions = [
  { value: "bank", label: "Bank Transfer" },
  { value: "bitcoin", label: "Bitcoin" },
  { value: "ethereum", label: "Ethereum" },
  { value: "usdt", label: "USDT (TRC-20)" },
  { value: "perfect_money", label: "Perfect Money" },
  { value: "payeer", label: "Payeer" },
];

export function WithdrawalView() {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank");
  const [walletAddress, setWalletAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [withdrawals, setWithdrawals] = useState<Awaited<ReturnType<typeof phpApi.withdrawals>>["withdrawals"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [wResult, summary] = await Promise.all([
          phpApi.withdrawals({ limit: 10 }),
          phpApi.financialSummary(),
        ]);
        if (active) {
          setWithdrawals(wResult.withdrawals);
          setBalance(summary.summary.balance);
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setError("Enter a valid withdrawal amount.");
      return;
    }
    if (!walletAddress.trim()) {
      setError("Wallet address is required.");
      return;
    }
    setSubmitting(true);
    try {
      await phpApi.createWithdrawal({ amount: value, method, wallet_address: walletAddress.trim() });
      setSuccess("Withdrawal request submitted. It will be processed after review.");
      setAmount("");
      setWalletAddress("");
      Promise.all([phpApi.withdrawals({ limit: 10 }), phpApi.financialSummary()])
        .then(([wResult, summary]) => {
          setWithdrawals(wResult.withdrawals);
          setBalance(summary.summary.balance);
        })
        .catch(() => {});
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Finance</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Withdraw Funds</h1>
        <p className="mt-2 text-sm text-muted-foreground">Request a withdrawal. A 2% fee applies to all withdrawals.</p>
      </header>

      {balance !== null ? (
        <div className="ui-card flex items-center justify-between rounded-2xl px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Available Balance</p>
            <p className="mt-1 text-2xl font-extrabold text-primary">${balance.toFixed(2)}</p>
          </div>
          <AlertCircle size={20} className="text-muted-foreground" />
        </div>
      ) : null}

      {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      {success ? <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p> : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.2fr]">
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Send size={18} /></span>
            <div>
              <h2 className="text-lg font-extrabold">New Withdrawal</h2>
              <p className="text-xs text-muted-foreground">2% fee deducted from amount</p>
            </div>
          </div>
          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Amount (USD)
              <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} mt-1.5`} placeholder="Enter amount" required />
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Payment Method
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${inputClass} mt-1.5`}>
                {methodOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Wallet Address / Account Details
              <input value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} className={`${inputClass} mt-1.5`} placeholder="Enter wallet address" required />
            </label>
            <button type="submit" disabled={submitting} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60">
              <Send size={16} /> {submitting ? "Submitting…" : "Submit Withdrawal"}
            </button>
          </form>
        </section>

        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Recent Withdrawals</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Fee</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="py-10 text-center text-muted-foreground">Loading withdrawals…</td></tr>
                ) : !withdrawals || withdrawals.items.length === 0 ? (
                  <tr><td colSpan={4} className="py-10 text-center text-muted-foreground">No withdrawals yet.</td></tr>
                ) : (
                  withdrawals.items.map((w) => (
                    <tr key={w.id} className="border-b border-line/50 last:border-0">
                      <td className="py-3 font-bold">${w.amount.toFixed(2)}</td>
                      <td className="py-3 text-muted-foreground">${w.fee.toFixed(2)}</td>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
