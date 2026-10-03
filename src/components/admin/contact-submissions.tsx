"use client";

import { useState, useEffect } from "react";
import { Mail, Check } from "lucide-react";
import { phpApi } from "@/lib/php-api";

type Submission = { id: number; name: string; email: string; subject: string; is_read: boolean; created_at: string };

export function ContactSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Submission | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await phpApi.adminContactSubmissions();
        if (active) setSubmissions(r.submissions as unknown as Submission[]);
      } catch { /* silent */ } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Communication</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Contact Form Submissions</h1>
        <p className="mt-2 text-sm text-muted-foreground">View and manage contact form messages from visitors.</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>
          ) : submissions.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {submissions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${selected?.id === s.id ? "border-primary bg-primary/5" : "border-line hover:border-primary/40"}`}
                >
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${s.is_read ? "bg-surface-2 text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                    <Mail size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{s.subject}</p>
                    <p className="text-xs text-muted-foreground">{s.name} • {s.email}</p>
                  </div>
                  {!s.is_read && <span className="size-2.5 shrink-0 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="ui-card rounded-2xl p-5 sm:p-6">
          {selected ? (
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold">{selected.subject}</h2>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${selected.is_read ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>
                  {selected.is_read ? "Read" : "Unread"}
                </span>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">From</span><span className="font-bold">{selected.name}</span></div>
                <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Email</span><span className="font-bold">{selected.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-bold">{new Date(selected.created_at).toLocaleString()}</span></div>
              </div>
              <div className="mt-4 rounded-xl border border-line bg-surface-2/30 p-4">
                <p className="text-sm leading-6">Message content will be displayed here.</p>
              </div>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Select a submission to view details.</p>
          )}
        </section>
      </div>
    </div>
  );
}
