import type { Metadata } from "next";

export const metadata: Metadata = { title: "Session Management" };

export default function SessionsPage() {
  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Security</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Session Management</h1>
        <p className="mt-2 text-sm text-muted-foreground">View active sessions and manage session security.</p>
      </header>
      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <p className="text-sm text-muted-foreground">Active session management will be available in Stage 2. You can view login history and security events from the Activity page.</p>
      </section>
    </div>
  );
}
