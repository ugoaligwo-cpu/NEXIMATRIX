"use client";

import { Bell, Check, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { phpApi, type NotificationItem } from "@/lib/php-api";
import { formatDate } from "@/lib/utils";

export function NotificationsView() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    phpApi
      .notifications()
      .then((result) => setItems(result.notifications))
      .catch(() => setError("Notifications could not be loaded."))
      .finally(() => setLoading(false));
  };

  // Fetching external account data is intentionally performed on mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, []);

  const markRead = async (id: number) => {
    try {
      await phpApi.markNotificationRead(id);
      setItems((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item));
    } catch {
      setError("The notification could not be updated.");
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Account center</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Notifications</h1>
        </div>
        <button type="button" onClick={load} className="grid size-10 place-items-center rounded-xl border border-line text-muted-foreground hover:border-primary/40 hover:text-primary" aria-label="Refresh notifications">
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading notifications…</p>
        ) : items.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 rounded-xl border border-line px-4 py-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Bell size={16} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                </div>
                {item.read_at ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-success"><Check size={14} /> Read</span>
                ) : (
                  <button type="button" onClick={() => markRead(item.id)} className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-primary hover:border-primary/40">Mark read</button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">You have no notifications.</p>
        )}
      </section>
    </div>
  );
}
