"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { phpApi, type ActivityItem } from "@/lib/php-api";
import { formatDate } from "@/lib/utils";

export function AdminActivity() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError("");
    phpApi.adminActivity().then((result) => setItems(result.activity)).catch(() => setError("Activity log could not be loaded.")).finally(() => setLoading(false));
  };

  // Fetching external admin data is intentionally performed on mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  return <div className="flex flex-col gap-7"><header className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Administration</p><h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Activity log</h1><p className="mt-2 text-sm text-muted-foreground">Server-recorded account and administrator events.</p></div><button type="button" onClick={load} className="grid size-10 place-items-center rounded-xl border border-line text-muted-foreground hover:border-primary/40 hover:text-primary" aria-label="Refresh activity"><RefreshCw size={17} className={loading ? "animate-spin" : ""} /></button></header>{error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}<section className="ui-card overflow-x-auto rounded-2xl p-5 sm:p-6"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="pb-3">Event</th><th className="pb-3">Actor</th><th className="pb-3">Entity</th><th className="pb-3">Time</th></tr></thead><tbody>{loading ? <tr><td colSpan={4} className="py-10 text-center text-muted-foreground">Loading activity…</td></tr> : items.length === 0 ? <tr><td colSpan={4} className="py-10 text-center text-muted-foreground">No activity yet.</td></tr> : items.map((item) => <tr key={item.id ?? `${item.action}-${item.created_at}`} className="border-b border-line last:border-0"><td className="py-4 font-bold">{item.action}</td><td className="py-4 text-muted-foreground">{item.full_name ?? item.username ?? "System"}</td><td className="py-4 text-xs text-muted-foreground">{item.entity_type ?? "—"}{item.entity_id ? ` #${item.entity_id}` : ""}</td><td className="py-4 text-xs text-muted-foreground">{formatDate(item.created_at)}</td></tr>)}</tbody></table></section></div>;
}
