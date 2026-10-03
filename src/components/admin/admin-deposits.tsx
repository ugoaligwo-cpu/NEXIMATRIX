"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, Search, ExternalLink, FileText, Eye, X } from "lucide-react";
import { phpApi, ApiError, Deposit } from "@/lib/php-api";

type DepositWithUser = Deposit & { username: string; full_name: string; email: string };

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

const statusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: "Pending", className: "bg-warning/10 text-warning", icon: Clock },
  approved: { label: "Approved", className: "bg-success/10 text-success", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-danger/10 text-danger", icon: XCircle },
  cancelled: { label: "Cancelled", className: "bg-muted-foreground/10 text-muted-foreground", icon: XCircle },
};

export function AdminDepositsView() {
  const [deposits, setDeposits] = useState<DepositWithUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [detailDeposit, setDetailDeposit] = useState<DepositWithUser | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const limit = 15;

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const result = await phpApi.adminDeposits({ page, limit, status: statusFilter || undefined, search: search || undefined });
        if (active) {
          setDeposits(result.deposits.items);
          setTotal(result.deposits.total);
        }
      } catch {
        if (active) setError("Failed to load deposits.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [page, statusFilter, search]);

  const review = async (depositId: number, status: "approved" | "rejected") => {
    setError("");
    setSuccess("");
    try {
      await phpApi.adminReviewDeposit({ deposit_id: depositId, status, note: note || undefined });
      setSuccess(`Deposit ${status}.`);
      setReviewing(null);
      setNote("");
      const result = await phpApi.adminDeposits({ page, limit, status: statusFilter || undefined, search: search || undefined });
      setDeposits(result.deposits.items);
      setTotal(result.deposits.total);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to review deposit.");
    }
  };

  const viewDetail = async (depositId: number) => {
    setDetailLoading(true);
    setDetailDeposit(null);
    try {
      const result = await phpApi.adminDepositDetail(depositId);
      setDetailDeposit(result.deposit as unknown as DepositWithUser);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Failed to load deposit details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = deposits.filter((d) => {
    if (typeFilter === "crypto") return !!d.network;
    if (typeFilter === "manual") return !d.network;
    return true;
  });

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Administration</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Deposit Requests</h1>
        <p className="mt-2 text-sm text-muted-foreground">Review and approve or reject deposit requests.</p>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      {success ? <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className={`${inputClass} pl-9`} placeholder="Search by reference, username, or email" />
        </label>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className={inputClass}>
          <option value="">All types</option>
          <option value="crypto">Crypto deposits</option>
          <option value="manual">Manual deposits</option>
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={inputClass}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading deposits…</p>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No deposits found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="pb-3">User</th>
                    <th className="pb-3">Reference</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Network</th>
                    <th className="pb-3">Payer Account</th>
                    <th className="pb-3">Tx Reference</th>
                    <th className="pb-3">Evidence</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => {
                    const cfg = statusConfig[d.status] ?? statusConfig.pending;
                    const Icon = cfg.icon;
                    return (
                      <tr key={d.id} className="border-b border-line/50 last:border-0 align-top">
                        <td className="py-3">
                          <p className="font-bold">{d.full_name}</p>
                          <p className="text-xs text-muted-foreground">@{d.username}</p>
                        </td>
                        <td className="py-3 font-mono text-xs font-bold">{d.request_reference ?? `DEP-${d.id}`}</td>
                        <td className="py-3">{d.plan_name ?? "—"}</td>
                        <td className="py-3 font-bold">${d.amount.toFixed(2)}</td>
                        <td className="py-3 text-muted-foreground">{d.network ?? d.method}</td>
                        <td className="py-3 text-muted-foreground">{d.payer_account ?? "—"}</td>
                        <td className="py-3 text-muted-foreground">{d.reference ?? "—"}</td>
                        <td className="py-3">{d.proof_file ? (
                          <a
                            href={phpApi.adminDepositEvidenceUrl(d.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                          >
                            <ExternalLink size={12} /> View
                          </a>
                        ) : "—"}</td>
                        <td className="py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${cfg.className}`}>
                            <Icon size={12} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => viewDetail(d.id)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-primary transition hover:border-primary/40">
                              <Eye size={12} />
                            </button>
                            {d.status === "pending" && (
                              reviewing === Number(d.id) ? (
                                <div className="flex flex-col gap-2">
                                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="h-8 w-36 rounded-lg border border-line bg-surface-2/60 px-2 text-xs" />
                                  <div className="flex gap-1.5">
                                    <button onClick={() => review(d.id, "approved")} className="rounded-lg bg-success px-2.5 py-1 text-xs font-bold text-white hover:opacity-80">Approve</button>
                                    <button onClick={() => review(d.id, "rejected")} className="rounded-lg bg-danger px-2.5 py-1 text-xs font-bold text-white hover:opacity-80">Reject</button>
                                    <button onClick={() => setReviewing(null)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-muted-foreground hover:border-primary/40">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <button onClick={() => setReviewing(Number(d.id))} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-primary transition hover:border-primary/40">
                                  Review
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{total} total deposits</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold transition hover:border-primary/40 disabled:opacity-40">Previous</button>
                <button onClick={() => setPage((p) => p + 1)} disabled={page * limit >= total} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold transition hover:border-primary/40 disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Detail Modal */}
      {detailDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetailDeposit(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold">Deposit Details</h3>
              <button onClick={() => setDetailDeposit(null)} className="grid size-8 place-items-center rounded-lg border border-line text-muted-foreground hover:border-danger/40 hover:text-danger">
                <X size={16} />
              </button>
            </div>

            {detailLoading ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {/* User Info */}
                <div className="rounded-xl border border-line bg-surface-2/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">User Information</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Full Name</p>
                      <p className="font-bold">{detailDeposit.full_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Username</p>
                      <p className="font-bold">@{detailDeposit.username}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-bold">{detailDeposit.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Request Reference</p>
                      <p className="font-mono text-xs font-bold">{detailDeposit.request_reference}</p>
                    </div>
                  </div>
                </div>

                {/* Deposit Info */}
                <div className="rounded-xl border border-line bg-surface-2/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Deposit Information</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Plan</p>
                      <p className="font-bold">{detailDeposit.plan_name ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="font-bold">${detailDeposit.amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Deposit Fee</p>
                      <p className="font-bold">${detailDeposit.deposit_fee.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Credit Amount</p>
                      <p className="font-bold text-primary">${detailDeposit.credit_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Payment Method</p>
                      <p className="font-bold">{detailDeposit.method}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Network</p>
                      <p className="font-bold">{detailDeposit.network ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Payer Account</p>
                      <p className="font-bold">{detailDeposit.payer_account ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Transaction Reference</p>
                      <p className="font-bold">{detailDeposit.reference ?? "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Status & Review */}
                <div className="rounded-xl border border-line bg-surface-2/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Status & Review</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${statusConfig[detailDeposit.status]?.className}`}>
                        {statusConfig[detailDeposit.status]?.icon && (() => { const I = statusConfig[detailDeposit.status].icon; return <I size={12} />; })()}
                        {statusConfig[detailDeposit.status]?.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Submitted</p>
                      <p className="font-bold">{new Date(detailDeposit.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Reviewed By</p>
                      <p className="font-bold">{detailDeposit.reviewed_at ? new Date(detailDeposit.reviewed_at).toLocaleString() : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Admin Note</p>
                      <p className="font-bold">{detailDeposit.admin_note ?? "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Evidence */}
                {detailDeposit.proof_file && (
                  <div className="rounded-xl border border-line bg-surface-2/40 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Supporting Evidence</p>
                    <a
                      href={phpApi.adminDepositEvidenceUrl(detailDeposit.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                    >
                      <FileText size={16} /> View Evidence File
                    </a>
                  </div>
                )}

                {/* Actions */}
                {detailDeposit.status === "pending" && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => { review(detailDeposit.id, "approved"); setDetailDeposit(null); }}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-success px-4 text-sm font-bold text-white transition hover:opacity-80"
                    >
                      <CheckCircle2 size={16} /> Approve
                    </button>
                    <button
                      onClick={() => { review(detailDeposit.id, "rejected"); setDetailDeposit(null); }}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-danger px-4 text-sm font-bold text-white transition hover:opacity-80"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
