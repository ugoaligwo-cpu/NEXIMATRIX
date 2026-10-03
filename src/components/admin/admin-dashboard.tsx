"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  LifeBuoy,
  Mail,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { phpApi, type ActivityItem } from "@/lib/php-api";
import { formatDate } from "@/lib/utils";

type OverviewStats = {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  pendingUsers: number;
  newToday: number;
  newThisWeek: number;
  openTickets: number;
  inProgressTickets: number;
  waitingTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  totalDeposits: number;
  pendingDeposits: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  totalInvested: number;
  totalProfitPaid: number;
  publishedPages: number;
  draftPages: number;
  publishedNews: number;
  activeFaqs: number;
  newsletterSubscribers: number;
  unreadContactSubmissions: number;
  failedLogins24h: number;
  securityEvents24h: number;
  phpVersion: string;
  dbConnected: boolean;
  maintenanceMode: boolean;
  storageWritable: boolean;
};

type SystemHealth = {
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

export function AdminDashboard() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [recentUsers, setRecentUsers] = useState<Array<{ id: number; username: string; email: string; status: string; created_at: string }>>([]);
  const [recentTickets, setRecentTickets] = useState<Array<{ id: number; subject: string; status: string; created_at: string; username?: string }>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      phpApi.adminOverviewStats(),
      phpApi.adminSystemHealth(),
      phpApi.adminRecentActivity(),
      phpApi.adminRecentUsers(),
      phpApi.adminRecentTickets(),
    ])
      .then(([statsRes, healthRes, activityRes, usersRes, ticketsRes]) => {
        setStats(statsRes.stats as unknown as OverviewStats);
        setHealth(healthRes.health as unknown as SystemHealth);
        setRecentActivity(activityRes.activity);
        setRecentUsers(usersRes.users);
        setRecentTickets(ticketsRes.tickets);
      })
      .catch(() => setError("Admin overview could not be loaded."));
  }, []);

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, tone: "text-primary", href: "/admin/users" },
    { label: "Active Users", value: stats?.activeUsers ?? 0, icon: CheckCircle2, tone: "text-success", href: "/admin/users" },
    { label: "Suspended", value: stats?.suspendedUsers ?? 0, icon: ShieldAlert, tone: "text-danger", href: "/admin/users" },
    { label: "New Today", value: stats?.newToday ?? 0, icon: Clock, tone: "text-violet-500", href: "/admin/users" },
    { label: "Open Tickets", value: stats?.openTickets ?? 0, icon: LifeBuoy, tone: "text-warning", href: "/admin/support" },
    { label: "Pending Deposits", value: stats?.pendingDeposits ?? 0, icon: ArrowDownToLine, tone: "text-primary", href: "/admin/finance/deposits" },
    { label: "Pending Withdrawals", value: stats?.pendingWithdrawals ?? 0, icon: ArrowUpFromLine, tone: "text-danger", href: "/admin/finance/withdrawals" },
    { label: "Unread Messages", value: stats?.unreadContactSubmissions ?? 0, icon: Mail, tone: "text-sky-500", href: "/admin/communication/contact" },
  ];

  const healthChecks = [
    { label: "Database", ok: health?.dbConnected ?? false },
    { label: "Storage", ok: health?.storageWritable ?? false },
    { label: "PHP " + (health?.phpVersion ?? ""), ok: true },
    { label: "Maintenance", ok: !(health?.maintenanceMode ?? false), warn: health?.maintenanceMode ?? false },
  ];

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Administration</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Admin Overview</h1>
        </div>
        <p className="text-sm text-muted-foreground">System status, user statistics, and recent activity.</p>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="ui-card rounded-2xl p-5 transition hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{card.label}</p>
                <Icon size={18} className={card.tone} />
              </div>
              <p className="mt-5 text-3xl font-extrabold tracking-[-0.04em]">{card.value}</p>
            </Link>
          );
        })}
      </div>

      {/* System Health + Financial Overview */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold">
            <ShieldCheck size={17} className="text-success" /> System Health
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {healthChecks.map((check) => (
              <div key={check.label} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5">
                {check.ok ? (
                  <CheckCircle2 size={15} className="text-success" />
                ) : (
                  <AlertTriangle size={15} className="text-warning" />
                )}
                <span className="text-xs font-bold">{check.label}</span>
              </div>
            ))}
          </div>
          {health ? (
            <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <p>DB Tables: {health.dbTables} | Storage: {health.storageWritable ? "Writable" : "Read-only"}</p>
              <p>Mail: {health.mailEnabled ? "Enabled" : "Disabled"} | Session: {health.sessionLifetime}s</p>
              <p>Extensions: {Object.entries(health.extensions).map(([k, v]) => `${k}: ${v ? "✓" : "✗"}`).join(", ")}</p>
            </div>
          ) : null}
        </section>

        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold">
            <DollarSign size={17} className="text-primary" /> Financial Overview
            <span className="ml-auto rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-warning">Demo</span>
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Total Deposits</p>
              <p className="mt-1 text-xl font-extrabold">${(stats?.totalDeposits ?? 0).toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-line p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Total Withdrawals</p>
              <p className="mt-1 text-xl font-extrabold">${(stats?.totalWithdrawals ?? 0).toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-line p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Active Investments</p>
              <p className="mt-1 text-xl font-extrabold">${(stats?.totalInvested ?? 0).toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-line p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Profit Paid</p>
              <p className="mt-1 text-xl font-extrabold">${(stats?.totalProfitPaid ?? 0).toFixed(2)}</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Demonstration data only. No real financial transactions are processed.</p>
        </section>
      </div>

      {/* Recent Activity + Recent Users */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold">Recent Activity</h2>
            <Link href="/admin/activity" className="text-xs font-bold text-primary hover:underline">View all</Link>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 8).map((item, i) => (
                <div key={`${item.action}-${item.created_at}-${i}`} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Activity size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{item.action.replace(/^user\./, "").replace(/^admin\./, "").replaceAll("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted-foreground">No recent activity.</p>
            )}
          </div>
        </section>

        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold">Recent Users</h2>
            <Link href="/admin/users" className="text-xs font-bold text-primary hover:underline">View all</Link>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {recentUsers.length > 0 ? (
              recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Users size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{u.username}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(u.created_at)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${u.status === "active" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                    {u.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted-foreground">No users yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* Quick Links */}
      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <h2 className="text-base font-extrabold">Quick Links</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[
            { label: "Users", href: "/admin/users", icon: Users },
            { label: "Support", href: "/admin/support", icon: LifeBuoy },
            { label: "Notifications", href: "/admin/notifications", icon: Bell },
            { label: "Content", href: "/admin/content/pages", icon: FileText },
            { label: "Settings", href: "/admin/settings/general", icon: ShieldAlert },
            { label: "System", href: "/admin/system/info", icon: Activity },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center gap-2 rounded-xl border border-line px-4 py-5 text-center transition hover:border-primary/40 hover:bg-primary/5"
              >
                <Icon size={20} className="text-primary" />
                <span className="text-xs font-bold">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
