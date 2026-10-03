"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Server, Database, HardDrive, Mail } from "lucide-react";
import { phpApi } from "@/lib/php-api";

type HealthData = {
  phpVersion: string;
  extensions: Record<string, boolean>;
  dbConnected: boolean;
  dbTables: number;
  storageWritable: boolean;
  storageHyipImportsWritable: boolean;
  mailEnabled: boolean;
  sessionLifetime: number;
  maintenanceMode: boolean;
  siteName: string;
};

export function SystemStatus() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    phpApi.adminSystemHealth()
      .then((result) => setHealth(result.health as HealthData))
      .catch(() => setError("System health could not be loaded."));
  }, []);

  if (error) return <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>;
  if (!health) return <p className="text-sm text-muted-foreground">Loading system status...</p>;

  const checks = [
    { label: "Database Connection", ok: health.dbConnected, icon: Database },
    { label: "Storage Writable", ok: health.storageWritable, icon: HardDrive },
    { label: "HYIP Imports Writable", ok: health.storageHyipImportsWritable, icon: HardDrive },
    { label: "Mail System", ok: health.mailEnabled, icon: Mail, warn: !health.mailEnabled },
  ];

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">System</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">System Status</h1>
        <p className="mt-2 text-sm text-muted-foreground">Application health, extensions, and connectivity.</p>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {checks.map((check) => {
          const Icon = check.icon;
          return (
            <div key={check.label} className="ui-card rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{check.label}</p>
                <Icon size={18} className={check.ok ? "text-success" : "text-warning"} />
              </div>
              <p className="mt-4 flex items-center gap-2 text-lg font-extrabold">
                {check.ok ? <CheckCircle2 size={18} className="text-success" /> : <XCircle size={18} className="text-warning" />}
                {check.ok ? "OK" : check.warn ? "Disabled" : "Error"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><Server size={17} className="text-primary" /> Server Information</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">PHP Version</span><span className="font-bold">{health.phpVersion}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Database Tables</span><span className="font-bold">{health.dbTables}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Session Lifetime</span><span className="font-bold">{health.sessionLifetime}s</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Site Name</span><span className="font-bold">{health.siteName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Maintenance Mode</span><span className={`font-bold ${health.maintenanceMode ? "text-warning" : "text-success"}`}>{health.maintenanceMode ? "Enabled" : "Disabled"}</span></div>
          </div>
        </section>

        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><Server size={17} className="text-primary" /> PHP Extensions</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {Object.entries(health.extensions).map(([name, loaded]) => (
              <div key={name} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                {loaded ? <CheckCircle2 size={14} className="text-success" /> : <XCircle size={14} className="text-danger" />}
                <span className="text-xs font-bold">{name}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
