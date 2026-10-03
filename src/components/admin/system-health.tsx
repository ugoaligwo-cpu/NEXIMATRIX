"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { phpApi } from "@/lib/php-api";

type HealthCheck = { ok: boolean; label: string; warn?: boolean };

export function SystemHealth() {
  const [checks, setChecks] = useState<Record<string, HealthCheck>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    phpApi.adminSystemHealthChecks()
      .then((r) => setChecks(r.checks as unknown as Record<string, HealthCheck>))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Running health checks...</p>;

  const allOk = Object.values(checks).every((c) => c.ok);

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">System</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">System Health</h1>
        <p className="mt-2 text-sm text-muted-foreground">Application health checks and connectivity status.</p>
      </header>

      <div className={`ui-card flex items-center gap-3 rounded-2xl p-5 ${allOk ? "border-success/30" : "border-warning/30"}`}>
        {allOk ? <CheckCircle2 size={24} className="text-success" /> : <AlertTriangle size={24} className="text-warning" />}
        <div>
          <p className="text-lg font-extrabold">{allOk ? "All Systems Operational" : "Some Checks Failed"}</p>
          <p className="text-sm text-muted-foreground">{Object.keys(checks).length} checks performed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Object.entries(checks).map(([key, check]) => (
          <div key={key} className="ui-card flex items-center gap-3 rounded-2xl p-5">
            {check.ok ? <CheckCircle2 size={20} className="text-success" /> : <XCircle size={20} className={check.warn ? "text-warning" : "text-danger"} />}
            <div>
              <p className="font-bold">{check.label}</p>
              <p className="text-xs text-muted-foreground">{check.ok ? "OK" : check.warn ? "Warning" : "Failed"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
