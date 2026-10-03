"use client";

import { Activity, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { phpApi, type ActivityItem } from "@/lib/php-api";
import { formatDate } from "@/lib/utils";

function readableAction(action: string) {
  return action
    .replace(/^user\./, "")
    .replace(/^admin\./, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ActivityView() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    phpApi
      .activity()
      .then((result) => setItems(result.activity))
      .catch(() => setError("Activity history could not be loaded."))
      .finally(() => setLoading(false));
  };

  // Fetching external account data is intentionally performed on mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, []);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Account history</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Activity</h1>
        </div>
        <button type="button" onClick={load} className="grid size-10 place-items-center rounded-xl border border-line text-muted-foreground hover:border-primary/40 hover:text-primary" aria-label="Refresh activity">
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading activity…</p>
        ) : items.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {items.map((item, index) => (
              <li key={`${item.id ?? item.action}-${item.created_at}-${index}`} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Activity size={16} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{readableAction(item.action)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">No account activity yet.</p>
        )}
      </section>
    </div>
  );
}
