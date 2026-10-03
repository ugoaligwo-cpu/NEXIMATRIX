"use client";

import { LifeBuoy, MessageSquare, Plus, Send } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, phpApi, type SupportTicket } from "@/lib/php-api";
import { formatDate } from "@/lib/utils";

const inputClass = "h-11 w-full rounded-xl border border-line bg-surface-2/60 px-3.5 text-sm outline-none transition-colors focus:border-primary";

export function SupportView() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const loadTickets = async () => {
    setLoading(true);
    try {
      const result = await phpApi.supportTickets();
      setTickets(result.tickets.items);
    } catch {
      setError("Support tickets could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetching external account data is intentionally performed on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTickets();
  }, []);

  const openTicket = async (id: number) => {
    try {
      const result = await phpApi.supportTicket(id);
      setSelected(result.ticket);
    } catch {
      setError("That support ticket could not be opened.");
    }
  };

  const createTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const result = await phpApi.createSupportTicket({ subject, message });
      setSubject("");
      setMessage("");
      setSelected(result.ticket);
      setStatus("Support request created.");
      await loadTickets();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Support request could not be created.");
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const result = await phpApi.replyToSupport({ ticket_id: selected.id, message: reply });
      setSelected(result.ticket);
      setReply("");
      setStatus("Reply sent.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Reply could not be sent.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Account help</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Support</h1>
        <p className="mt-2 text-sm text-muted-foreground">Create a request and read responses from the support team.</p>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      {status ? <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{status}</p> : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Plus size={18} /></span>
            <div><h2 className="text-lg font-extrabold">New request</h2><p className="text-xs text-muted-foreground">Usually answered within one business day.</p></div>
          </div>
          <form onSubmit={createTicket} className="mt-6 flex flex-col gap-4">
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} className={inputClass} required minLength={3} maxLength={160} placeholder="Briefly describe your request" /></label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Message<textarea value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-32 w-full rounded-xl border border-line bg-surface-2/60 p-3.5 text-sm outline-none transition-colors focus:border-primary" required maxLength={10000} placeholder="Tell us how we can help" /></label>
            <button type="submit" disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-white transition hover:bg-primary-strong disabled:opacity-60"><Send size={16} /> {saving ? "Sending…" : "Send request"}</button>
          </form>
        </section>

        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3"><LifeBuoy size={19} className="text-primary" /><h2 className="text-lg font-extrabold">Your requests</h2></div>
          {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading requests…</p> : tickets.length > 0 ? <ul className="mt-5 flex flex-col gap-2">{tickets.map((ticket) => <li key={ticket.id}><button type="button" onClick={() => openTicket(ticket.id)} className="flex w-full items-center gap-3 rounded-xl border border-line px-4 py-3 text-left transition hover:border-primary/40"><MessageSquare size={16} className="text-primary" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{ticket.subject}</span><span className="mt-1 block text-xs capitalize text-muted-foreground">{ticket.status} · {formatDate(ticket.updated_at)}</span></span></button></li>)}</ul> : <p className="py-8 text-center text-sm text-muted-foreground">No support requests yet.</p>}
        </section>
      </div>

      {selected ? <section className="ui-card rounded-2xl p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Ticket #{selected.id}</p><h2 className="mt-1 text-lg font-extrabold">{selected.subject}</h2></div><span className="rounded-full border border-line px-3 py-1.5 text-xs font-bold capitalize text-muted-foreground">{selected.status}</span></div><div className="mt-5 flex flex-col gap-3">{(selected.messages ?? []).map((item) => <div key={item.id} className={`rounded-xl border px-4 py-3 ${item.author_type === "admin" ? "border-primary/25 bg-primary/5" : "border-line"}`}><div className="flex items-center justify-between gap-3 text-xs font-bold"><span className="capitalize">{item.author_type === "admin" ? "Support team" : "You"}</span><span className="text-muted-foreground">{formatDate(item.created_at)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.body}</p></div>)}</div><form onSubmit={sendReply} className="mt-5 flex flex-col gap-3"><label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Reply<textarea value={reply} onChange={(event) => setReply(event.target.value)} className="min-h-24 w-full rounded-xl border border-line bg-surface-2/60 p-3.5 text-sm outline-none focus:border-primary" required maxLength={10000} placeholder="Write a reply" /></label><button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-60"><Send size={15} /> {saving ? "Sending…" : "Send reply"}</button></form></section> : null}
    </div>
  );
}
