"use client";

import { useState, useEffect } from "react";
import { Shield, AlertTriangle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { phpApi } from "@/lib/php-api";

type LoginAttempt = { id: number; identifier: string; success: boolean; ip_address: string | null; created_at: string };
type FailedLogin = { identifier: string; attempts: number; last_attempt: string };

export function SecuritySettings() {
  const [loginHistory, setLoginHistory] = useState<LoginAttempt[]>([]);
  const [failedLogins, setFailedLogins] = useState<FailedLogin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      phpApi.adminLoginHistory({ limit: 20 }),
      phpApi.adminFailedLogins(24),
    ])
      .then(([historyRes, failedRes]) => {
        setLoginHistory(historyRes.attempts as unknown as LoginAttempt[]);
        setFailedLogins(failedRes.failed as unknown as FailedLogin[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading security data...</p>;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Security</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Security Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Login history, failed attempts, and security monitoring.</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><Clock size={17} className="text-primary" /> Login History</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr><th className="pb-3">Identifier</th><th className="pb-3">IP</th><th className="pb-3">Result</th><th className="pb-3">Date</th></tr>
              </thead>
              <tbody>
                {loginHistory.map((a) => (
                  <tr key={a.id} className="border-b border-line/50 last:border-0">
                    <td className="py-3 font-bold">{a.identifier}</td>
                    <td className="py-3 text-muted-foreground">{a.ip_address || "—"}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${a.success ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                        {a.success ? "Success" : "Failed"}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{new Date(a.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><AlertTriangle size={17} className="text-warning" /> Failed Logins (24h)</h2>
          <div className="mt-4">
            {failedLogins.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted-foreground">No failed login attempts in the last 24 hours.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {failedLogins.map((f) => (
                  <div key={f.identifier} className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
                    <div>
                      <p className="text-sm font-bold">{f.identifier}</p>
                      <p className="text-xs text-muted-foreground">Last: {new Date(f.last_attempt).toLocaleString()}</p>
                    </div>
                    <span className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-bold text-danger">{f.attempts} attempts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
