import type { Metadata } from "next";

export const metadata: Metadata = { title: "Database Backup" };

export default function BackupPage() {
  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">System</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Database Backup</h1>
        <p className="mt-2 text-sm text-muted-foreground">Create and manage database backups.</p>
      </header>
      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <p className="text-sm text-muted-foreground">Database backup functionality will be available in Stage 2. Backups are stored in the Apache-denied storage directory.</p>
      </section>
    </div>
  );
}
