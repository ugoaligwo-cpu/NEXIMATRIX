"use client";

import { useState, useEffect } from "react";
import { Activity, CheckCircle2, XCircle, Clock, Database, Server, HardDrive, RefreshCw } from "lucide-react";
import { phpApi } from "@/lib/php-api";

type Diagnostics = {
  phpVersion: string;
  phpSapi: string;
  serverSoftware: string;
  databaseVersion: string;
  databaseTables: number;
  extensions: Record<string, boolean>;
  storageWritable: boolean;
  hyipImportsWritable: boolean;
  backupsWritable: boolean;
  logsWritable: boolean;
  timezone: string;
  maxExecutionTime: string;
  memoryLimit: string;
  uploadMaxFilesize: string;
  postMaxSize: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  mailEnabled: boolean;
  userCount: number;
  activeTickets: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  errorLogSize: number;
  lastBackup: { filename: string; size: number; created_at: string } | null;
};

type Task = {
  id: number;
  task_name: string;
  task_description: string | null;
  schedule: string;
  last_run_at: string | null;
  next_run_at: string | null;
  status: string;
  is_active: boolean;
  updated_at: string;
};

export function SystemDiagnostics() {
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [diagRes, tasksRes] = await Promise.all([
          phpApi.adminDiagnostics(),
          phpApi.adminScheduledTasks(),
        ]);
        if (active) {
          setDiag(diagRes.diagnostics as unknown as Diagnostics);
          setTasks(tasksRes.tasks as unknown as Task[]);
        }
      } catch {
        if (active) setError("Failed to load diagnostics.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading diagnostics...</p>;
  if (error) return <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>;
  if (!diag) return <p className="text-sm text-muted-foreground">No diagnostics available.</p>;

  const checks = [
    { label: "Storage Writable", ok: diag.storageWritable, icon: HardDrive },
    { label: "HYIP Imports Writable", ok: diag.hyipImportsWritable, icon: HardDrive },
    { label: "Backups Writable", ok: diag.backupsWritable, icon: Database },
    { label: "Logs Writable", ok: diag.logsWritable, icon: Server },
    { label: "Registration Enabled", ok: diag.registrationEnabled, icon: CheckCircle2 },
    { label: "Mail Enabled", ok: diag.mailEnabled, icon: CheckCircle2, warn: !diag.mailEnabled },
  ];

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">System</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">System Diagnostics</h1>
        <p className="mt-2 text-sm text-muted-foreground">Application health, server info, and scheduled task status.</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><Server size={17} className="text-primary" /> Server Information</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">PHP Version</span><span className="font-bold">{diag.phpVersion}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">PHP SAPI</span><span className="font-bold">{diag.phpSapi}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Server Software</span><span className="font-bold">{diag.serverSoftware}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Database Version</span><span className="font-bold">{diag.databaseVersion}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Database Tables</span><span className="font-bold">{diag.databaseTables}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Timezone</span><span className="font-bold">{diag.timezone}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Memory Limit</span><span className="font-bold">{diag.memoryLimit}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Max Execution Time</span><span className="font-bold">{diag.maxExecutionTime}s</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Upload Max Filesize</span><span className="font-bold">{diag.uploadMaxFilesize}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Post Max Size</span><span className="font-bold">{diag.postMaxSize}</span></div>
          </div>
        </section>

        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><CheckCircle2 size={17} className="text-success" /> Health Checks</h2>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {checks.map((check) => {
              const Icon = check.icon;
              return (
                <div key={check.label} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                  <Icon size={14} className={check.ok ? "text-success" : "text-warning"} />
                  <span className="text-xs font-bold">{check.label}</span>
                  {check.ok ? <CheckCircle2 size={12} className="ml-auto text-success" /> : <XCircle size={12} className="ml-auto text-warning" />}
                </div>
              );
            })}
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Total Users</span><span className="font-bold">{diag.userCount}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Active Tickets</span><span className="font-bold">{diag.activeTickets}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Pending Deposits</span><span className="font-bold">{diag.pendingDeposits}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Pending Withdrawals</span><span className="font-bold">{diag.pendingWithdrawals}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Error Log Size</span><span className="font-bold">{diag.errorLogSize} bytes</span></div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Backup</span>
              <span className="font-bold">{diag.lastBackup ? `${diag.lastBackup.filename} (${new Date(diag.lastBackup.created_at).toLocaleDateString()})` : "None"}</span>
            </div>
          </div>
        </section>
      </div>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-extrabold"><Clock size={17} className="text-primary" /> Scheduled Tasks</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="pb-3">Task</th>
                <th className="pb-3">Schedule</th>
                <th className="pb-3">Last Run</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="border-b border-line/50 last:border-0">
                  <td className="py-3">
                    <p className="font-bold">{t.task_name}</p>
                    {t.task_description ? <p className="text-xs text-muted-foreground">{t.task_description}</p> : null}
                  </td>
                  <td className="py-3 capitalize">{t.schedule}</td>
                  <td className="py-3 text-muted-foreground">{t.last_run_at ? new Date(t.last_run_at).toLocaleString() : "Never"}</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${t.is_active ? "bg-success/10 text-success" : "bg-muted-foreground/10 text-muted-foreground"}`}>
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
