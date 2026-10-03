"use client";

import { useState } from "react";
import { DollarSign, Plus, AlertTriangle, Search } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface-2/60 px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

type UserSearchResult = {
  id: number;
  username: string;
  full_name: string;
  email: string;
};

export function AddFunds() {
  const [username, setUsername] = useState("");
  const [searchedUser, setSearchedUser] = useState<UserSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const searchUser = async () => {
    if (!username.trim()) {
      setError("Enter a username to search.");
      return;
    }
    setError(""); setSuccess(""); setSearching(true); setSearchedUser(null);
    try {
      const result = await phpApi.adminSearchUser(username.trim());
      if (result.user) {
        setSearchedUser(result.user);
      } else {
        setError("No user found with that username.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchedUser) {
      setError("Search for a user first.");
      return;
    }
    setError(""); setSuccess(""); setSubmitting(true);
    try {
      await phpApi.adminAdjustBalance({
        user_id: searchedUser.id,
        amount: parseFloat(amount),
        type: "credit",
        description: reason || "Admin fund adjustment",
      });
      setSuccess(`Successfully credited $${parseFloat(amount).toFixed(2)} to @${searchedUser.username} (${searchedUser.full_name}).`);
      setUsername(""); setAmount(""); setReason(""); setSearchedUser(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add funds.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Transactions</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Add Funds</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add demo funds to a user's account by username. All credits are simulated and have no cash value.</p>
      </header>

      <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-warning">
        <AlertTriangle size={14} className="shrink-0" />
        <p>All fund additions are demo-only. No real money is transferred or credited.</p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      <form onSubmit={submit} className="ui-card max-w-2xl rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <DollarSign size={18} />
          </span>
          <div>
            <h2 className="text-lg font-extrabold">Credit User Account</h2>
            <p className="text-xs text-muted-foreground">Search by username, then add demo funds to their wallet</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-5">
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Username
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                placeholder="Enter username"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={searchUser}
                disabled={searching}
                className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-line px-4 text-sm font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-60"
              >
                <Search size={15} />
                {searching ? "..." : "Search"}
              </button>
            </div>
          </label>

          {searchedUser && (
            <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 px-4 py-3">
              <span className="grid size-10 place-items-center rounded-full bg-success/10 text-success">
                <DollarSign size={16} />
              </span>
              <div>
                <p className="text-sm font-bold">{searchedUser.full_name}</p>
                <p className="text-xs text-muted-foreground">@{searchedUser.username} | {searchedUser.email}</p>
              </div>
            </div>
          )}

          <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Amount (USD)
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${inputClass} mt-2`}
              placeholder="Enter amount"
              required
              min="0.01"
            />
          </label>

          <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Reason
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`${inputClass} mt-2`}
              placeholder="Reason for credit (optional)"
              maxLength={255}
            />
          </label>

          <button
            type="submit"
            disabled={submitting || !searchedUser}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white transition hover:bg-primary-strong disabled:opacity-60"
          >
            <Plus size={16} />
            {submitting ? "Processing..." : "Credit Account"}
          </button>
        </div>
      </form>
    </div>
  );
}
