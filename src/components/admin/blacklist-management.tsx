"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ShieldOff, ShieldCheck, Trash2 } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

type BlacklistEntry = {
  id: number;
  user_id: number;
  reason: string;
  created_at: string;
  username: string;
  full_name: string;
  email: string;
};

export function BlacklistManagement() {
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);

  const loadBlacklist = useCallback(async () => {
    setLoading(true);
    try {
      const result = await phpApi.adminBlacklist();
      setBlacklist(result.blacklist as unknown as BlacklistEntry[]);
    } catch {
      setError("Failed to load blacklist.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadBlacklist();
    return () => { active = false; };
  }, [loadBlacklist]);

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setAdding(true);
    try {
      await phpApi.adminAddToBlacklist(Number(userId), reason);
      setSuccess("Account added to blacklist.");
      setUserId(""); setReason("");
      setShowAddForm(false);
      loadBlacklist();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add to blacklist.");
    } finally {
      setAdding(false);
    }
  };

  const removeEntry = async (userId: number) => {
    if (!confirm("Remove this account from the blacklist?")) return;
    setError(""); setSuccess("");
    try {
      await phpApi.adminRemoveFromBlacklist(userId);
      setSuccess("Account removed from blacklist.");
      loadBlacklist();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove from blacklist.");
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Users</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Accounts Blacklist</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage restricted accounts. Blacklisted users cannot access the platform.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-danger px-4 text-sm font-bold text-white hover:bg-danger/90"
        >
          <ShieldOff size={16} /> Add to Blacklist
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      {showAddForm && (
        <form onSubmit={addEntry} className="ui-card flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Add Account to Blacklist</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              User ID
              <input type="number" value={userId} onChange={(e) => setUserId(e.target.value)} className={`${inputClass} mt-1.5`} placeholder="Enter user ID" required min="1" />
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Reason
              <input value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputClass} mt-1.5`} placeholder="Reason for restriction" required minLength={3} maxLength={500} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAddForm(false)} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-muted-foreground">Cancel</button>
            <button type="submit" disabled={adding} className="rounded-xl bg-danger px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
              {adding ? "Adding..." : "Add to Blacklist"}
            </button>
          </div>
        </form>
      )}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading blacklist...</p>
        ) : blacklist.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No blacklisted accounts.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Reason</th>
                  <th className="pb-3">Date Added</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {blacklist.map((entry) => (
                  <tr key={entry.id} className="border-b border-line/50 last:border-0">
                    <td className="py-3">
                      <p className="font-bold">{entry.full_name}</p>
                      <p className="text-xs text-muted-foreground">@{entry.username} | {entry.email}</p>
                    </td>
                    <td className="py-3 text-muted-foreground">{entry.reason}</td>
                    <td className="py-3 text-muted-foreground">{new Date(entry.created_at).toLocaleDateString()}</td>
                    <td className="py-3">
                      <button
                        onClick={() => removeEntry(entry.user_id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-success/30 px-3 py-1.5 text-xs font-bold text-success hover:border-success"
                      >
                        <ShieldCheck size={14} /> Remove
                      </button>
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
