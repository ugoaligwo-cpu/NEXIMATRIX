"use client";

import { useEffect, useState } from "react";
import { Server, Database, HardDrive, CheckCircle2, XCircle } from "lucide-react";
import { phpApi } from "@/lib/php-api";

type HealthData = {
  phpVersion: string;
  extensions: Record<string, boolean>;
  dbConnected: boolean;
  dbTables: number;
  storageWritable: boolean;
  mailEnabled: boolean;
  sessionLifetime: number;
  siteName: string;
};

export function SystemInfo() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    phpApi.adminSystemHealth()
      .then((result) => setHealth(result.health as HealthData))
      .catch(() => setError("System info could not be loaded."));
  }, []);

  if (error) return <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>;
  if (!health) return <p className="text-sm text-muted-foreground">Loading system info...</p>;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">System</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">System Information</h1>
        <p className="mt-2 text-sm text-muted-foreground">Server details, PHP configuration, and application status.</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><Server size={17} className="text-primary" /> Server</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">PHP Version</span><span className="font-bold">{health.phpVersion}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Site Name</span><span className="font-bold">{health.siteName}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Session Lifetime</span><span className="font-bold">{health.sessionLifetime}s</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mail</span><span className={`font-bold ${health.mailEnabled ? "text-success" : "text-warning"}`}>{health.mailEnabled ? "Enabled" : "Disabled"}</span></div>
          </div>
        </section>

        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><Database size={17} className="text-primary" /> Database</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Connection</span>
              <span className="flex items-center gap-1 font-bold text-success"><CheckCircle2 size={14} /> Connected</span>
            </div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Tables</span><span className="font-bold">{health.dbTables}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Storage</span>
              <span className="flex items-center gap-1 font-bold text-success"><CheckCircle2 size={14} /> Writable</span>
            </div>
          </div>
        </section>
      </div>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-extrabold"><HardDrive size={17} className="text-primary" /> PHP Extensions</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(health.extensions).map(([name, loaded]) => (
            <div key={name} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
              {loaded ? <CheckCircle2 size={14} className="text-success" /> : <XCircle size={14} className="text-danger" />}
              <span className="text-xs font-bold">{name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
