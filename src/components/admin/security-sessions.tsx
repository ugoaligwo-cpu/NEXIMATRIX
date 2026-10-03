"use client";

import { useState, useEffect } from "react";
import { Shield, Clock, Monitor } from "lucide-react";
import { phpApi } from "@/lib/php-api";

type LoginAttempt = { id: number; identifier: string; success: boolean; ip_address: string | null; created_at: string };

export function SecuritySessions() {
  const [attempts, setAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    phpApi.adminLoginHistory({ limit: 20 })
      .then((r) => setAttempts(r.attempts as unknown as LoginAttempt[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Security</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Login History</h1>
        <p className="mt-2 text-sm text-muted-foreground">Recent login attempts and security events.</p>
      </header>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {attempts.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No login attempts recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr><th className="pb-3">Identifier</th><th className="pb-3">IP</th><th className="pb-3">Result</th><th className="pb-3">Date</th></tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
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
        )}
      </section>
    </div>
  );
}
