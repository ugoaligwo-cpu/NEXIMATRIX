"use client";

import { useState, useEffect } from "react";
import { Mail, Users } from "lucide-react";
import { phpApi } from "@/lib/php-api";

type Subscriber = { id: number; email: string; is_subscribed: boolean; created_at: string };

export function Newsletter() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await phpApi.adminNewsletterSubscribers();
        if (active) setSubscribers(r.subscribers as unknown as Subscriber[]);
      } catch { /* silent */ } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const active = subscribers.filter((s) => s.is_subscribed);

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Communication</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Newsletter Subscriptions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage newsletter subscribers and consent-based mailing lists.</p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Total</p>
          <p className="mt-1 text-2xl font-extrabold text-primary">{subscribers.length}</p>
        </div>
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Active</p>
          <p className="mt-1 text-2xl font-extrabold text-success">{active.length}</p>
        </div>
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Unsubscribed</p>
          <p className="mt-1 text-2xl font-extrabold text-warning">{subscribers.length - active.length}</p>
        </div>
      </div>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading subscribers...</p>
        ) : subscribers.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No subscribers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr><th className="pb-3">Email</th><th className="pb-3">Status</th><th className="pb-3">Subscribed</th></tr>
              </thead>
              <tbody>
                {subscribers.map((s) => (
                  <tr key={s.id} className="border-b border-line/50 last:border-0">
                    <td className="py-3 font-bold">{s.email}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.is_subscribed ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                        {s.is_subscribed ? "Active" : "Unsubscribed"}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
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
