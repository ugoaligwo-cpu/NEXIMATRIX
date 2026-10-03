"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Info, XCircle } from "lucide-react";
import { phpApi } from "@/lib/php-api";

type LogEntry = { id: number; level: string; channel: string; message: string; created_at: string };

const levelIcon = (level: string) => {
  if (level === "error" || level === "critical") return <XCircle size={14} className="text-danger" />;
  if (level === "warning") return <AlertTriangle size={14} className="text-warning" />;
  return <Info size={14} className="text-primary" />;
};

export function SystemLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const result = await phpApi.adminSystemLogs({ level: levelFilter || undefined, limit: 50 });
        if (active) setLogs(result.logs as unknown as LogEntry[]);
      } catch { /* silent */ } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [levelFilter]);

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">System</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">System Logs</h1>
        <p className="mt-2 text-sm text-muted-foreground">Application and security log viewer with sensitive data redaction.</p>
      </header>

      <div className="flex gap-3">
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="h-10 rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none focus:border-primary">
          <option value="">All Levels</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading logs...</p>
        ) : logs.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No log entries.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-surface-2/50">
                {levelIcon(log.level)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{log.message}</p>
                  <p className="text-[11px] text-muted-foreground">{log.channel} | {new Date(log.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
