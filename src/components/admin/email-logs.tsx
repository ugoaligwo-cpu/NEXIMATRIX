"use client";

import { useState, useEffect } from "react";
import { Mail, CheckCircle2, XCircle, Clock } from "lucide-react";
import { phpApi } from "@/lib/php-api";

type EmailLog = {
  id: number;
  recipient: string;
  subject: string;
  status: string;
  error: string | null;
  notification_type: string;
  sent_at: string;
};

const statusConfig: Record<string, { icon: typeof CheckCircle2; label: string; className: string }> = {
  sent: { icon: CheckCircle2, label: "Sent", className: "bg-success/10 text-success" },
  failed: { icon: XCircle, label: "Failed", className: "bg-danger/10 text-danger" },
  queued: { icon: Clock, label: "Queued", className: "bg-warning/10 text-warning" },
};

export function EmailLogs() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await phpApi.adminEmailLogs(100);
        if (active) setLogs(r.logs as unknown as EmailLog[]);
      } catch { /* silent */ } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading email logs...</p>;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Email</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Email Delivery Logs</h1>
        <p className="mt-2 text-sm text-muted-foreground">Read-only view of automated email notifications sent by the system.</p>
      </header>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {logs.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No email logs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="pb-3">Recipient</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Subject</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const config = statusConfig[log.status] ?? statusConfig.queued;
                  const Icon = config.icon;
                  return (
                    <tr key={log.id} className="border-b border-line/50 last:border-0">
                      <td className="py-3 font-bold">{log.recipient}</td>
                      <td className="py-3">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                          {log.notification_type}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate py-3 text-muted-foreground">{log.subject}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${config.className}`}>
                          <Icon size={12} />
                          {config.label}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">{new Date(log.sent_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
