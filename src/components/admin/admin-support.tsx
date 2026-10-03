"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, MessageSquare, Clock, CheckCircle2, XCircle, AlertCircle, Send, Lock } from "lucide-react";
import { phpApi, ApiError, SupportTicket } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

const statusConfig: Record<string, { icon: typeof Clock; color: string }> = {
  open: { icon: AlertCircle, color: "text-warning bg-warning/10" },
  in_progress: { icon: Clock, color: "text-primary bg-primary/10" },
  waiting_for_user: { icon: Clock, color: "text-sky-500 bg-sky-500/10" },
  resolved: { icon: CheckCircle2, color: "text-success bg-success/10" },
  closed: { icon: XCircle, color: "text-muted-foreground bg-muted-foreground/10" },
};

const priorityColors: Record<string, string> = {
  low: "bg-surface-2 text-muted-foreground",
  normal: "bg-primary/10 text-primary",
  high: "bg-warning/10 text-warning",
  urgent: "bg-danger/10 text-danger",
};

export function AdminSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [assignees, setAssignees] = useState<Array<{ id: number; full_name: string; username: string }>>([]);

  const limit = 15;

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const result = await phpApi.adminSupportList({ search, status: statusFilter || undefined, page, limit });
      setTickets(result.tickets.items);
      setTotal(result.tickets.total);
    } catch {
      setError("Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [result, assigneesResult] = await Promise.all([
          phpApi.adminSupportList({ search, status: statusFilter || undefined, page, limit }),
          phpApi.adminSupportAssignees(),
        ]);
        if (active) {
          setTickets(result.tickets.items);
          setTotal(result.tickets.total);
          setAssignees(assigneesResult.assignees);
        }
      } catch {
        if (active) setError("Failed to load tickets.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [search, statusFilter, page]);

  const viewTicket = async (id: number) => {
    try {
      const result = await phpApi.adminSupportTicket(id);
      setSelected(result.ticket);
      setReply("");
      setInternal(false);
    } catch {
      setError("Failed to load ticket.");
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setSending(true);
    setError(""); setSuccess("");
    try {
      const result = await phpApi.adminSupportReply({ ticket_id: selected.id, message: reply.trim(), internal });
      setSelected(result.ticket);
      setReply("");
      setInternal(false);
      setSuccess("Reply sent.");
      loadTickets();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (ticketId: string, status: SupportTicket["status"]) => {
    try {
      await phpApi.adminSupportStatus({ ticket_id: Number(ticketId), status });
      setSuccess("Status updated.");
      if (selected && selected.id === Number(ticketId)) {
        const result = await phpApi.adminSupportTicket(Number(ticketId));
        setSelected(result.ticket);
      }
      loadTickets();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Support</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Support Tickets</h1>
        <p className="mt-2 text-sm text-muted-foreground">View, respond to, and manage user support requests.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className={`${inputClass} pl-9`} placeholder="Search tickets..." />
        </label>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={inputClass}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting_for_user">Waiting</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr]">
        {/* Ticket List */}
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No tickets found.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {tickets.map((t) => {
                const config = statusConfig[t.status] ?? statusConfig.open;
                const Icon = config.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => viewTicket(t.id)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${selected?.id === t.id ? "border-primary bg-primary/5" : "border-line hover:border-primary/40"}`}
                  >
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${config.color}`}>
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">#{t.id} · {t.username ?? "Unknown"} · {new Date(t.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${priorityColors[t.priority] ?? ""}`}>
                      {t.priority}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages} ({total})</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-40">Prev</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </section>

        {/* Ticket Detail */}
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          {selected ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold">Ticket #{selected.id}</h2>
                  <p className="text-sm text-muted-foreground">{selected.subject}</p>
                </div>
                <div className="flex gap-1.5">
                  <select
                    value={selected.status}
                    onChange={(e) => changeStatus(String(selected.id), e.target.value as SupportTicket["status"])}
                    className="h-8 rounded-lg border border-line bg-surface-2/60 px-2 text-xs outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_for_user">Waiting</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <select
                    value={String(selected.assigned_to ?? "")}
                    onChange={async (e) => {
                      try {
                        await phpApi.adminSupportAssign({ ticket_id: selected.id, assigned_to: Number(e.target.value) });
                        setSuccess("Ticket assigned.");
                        const result = await phpApi.adminSupportTicket(selected.id);
                        setSelected(result.ticket);
                        loadTickets();
                      } catch (err) {
                        setError(err instanceof ApiError ? err.message : "Failed to assign.");
                      }
                    }}
                    className="h-8 rounded-lg border border-line bg-surface-2/60 px-2 text-xs outline-none"
                  >
                    <option value="">Unassigned</option>
                    {assignees.map((a) => (
                      <option key={a.id} value={a.id}>{a.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {(selected.messages ?? []).map((msg) => (
                  <div key={msg.id} className={`rounded-xl border px-4 py-3 ${msg.author_type === "admin" ? "border-primary/25 bg-primary/5" : msg.author_type === "system" ? "border-line bg-surface-2/50" : "border-line"}`}>
                    {msg.is_internal === 1 && (
                      <p className="mb-1 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-warning">
                        <Lock size={10} /> Internal Note
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-3 text-xs font-bold">
                      <span className="capitalize">{msg.author_type === "admin" ? "Support Team" : msg.author_type === "system" ? "System" : "User"}</span>
                      <span className="text-muted-foreground">{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{msg.body}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={sendReply} className="flex flex-col gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                  <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-primary" />
                  Internal note (not visible to user)
                </label>
                <textarea value={reply} onChange={(e) => setReply(e.target.value)} className="min-h-24 w-full rounded-xl border border-line bg-surface-2/60 p-3.5 text-sm outline-none focus:border-primary" placeholder="Write a response or internal note..." required />
                <button type="submit" disabled={sending} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60">
                  <Send size={16} /> {sending ? "Sending..." : internal ? "Save Internal Note" : "Send Reply"}
                </button>
              </form>
            </div>
          ) : (
            <div className="grid min-h-[300px] place-items-center">
              <div className="text-center">
                <MessageSquare size={32} className="mx-auto text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold text-muted-foreground">Select a ticket to view conversation</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
