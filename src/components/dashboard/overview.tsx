"use client";

import {
  CheckCircle2,
  Clock3,
  Wallet,
  TrendingUp,
  DollarSign,
  Gift,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/providers/session-provider";
import { phpApi, type DashboardSummary, type FinancialSummary } from "@/lib/php-api";
import { formatDate } from "@/lib/utils";

const actionCards = [
  { label: "Make a deposit", href: "/deposit", icon: DollarSign },
  { label: "Invest funds", href: "/invest", icon: TrendingUp },
  { label: "Withdraw", href: "/withdrawal", icon: Wallet },
  { label: "Referral program", href: "/referrals", icon: Gift },
];

function readableAction(action: string) {
  return action
    .replace(/^user\./, "")
    .replace(/^admin\./, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function DashboardOverview() {
  const { user } = useSession();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      phpApi.dashboard(),
      phpApi.financialSummary(),
    ])
      .then(([dashResult, finResult]) => {
        if (active) {
          setSummary(dashResult.summary);
          setFinancial(finResult.summary);
        }
      })
      .catch(() => {
        if (active) setError("Your account overview could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  const cards = [
    {
      label: "Account status",
      value: user?.status === "active" ? "Active" : user?.status ?? "Unknown",
      detail: "Your account is protected by server-side authorization.",
      icon: CheckCircle2,
      tone: "text-success",
    },
    {
      label: "Wallet balance",
      value: financial ? `$${financial.balance.toFixed(2)}` : "—",
      detail: "Available funds for investment and withdrawal.",
      icon: Wallet,
      tone: "text-primary",
    },
    {
      label: "Total profit",
      value: financial ? `$${financial.totalProfit.toFixed(2)}` : "—",
      detail: "Earnings from your active and completed investments.",
      icon: TrendingUp,
      tone: "text-success",
    },
    {
      label: "Active investments",
      value: financial ? String(financial.activeInvested > 0 ? financial.activeInvested.toFixed(2) : "0") : "—",
      detail: "Total amount currently invested in active plans.",
      icon: DollarSign,
      tone: "text-violet-500",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Overview</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">
            Welcome, {user?.fullName?.split(" ")[0] ?? "there"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Your account, finances, and support activity at a glance.</p>
      </header>

      {error ? (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="ui-card rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{card.label}</p>
                <Icon size={18} className={card.tone} />
              </div>
              <p className="mt-5 text-2xl font-extrabold tracking-[-0.04em]">{card.value}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{card.detail}</p>
            </article>
          );
        })}
      </div>

      {financial && financial.totalReferrals > 0 ? (
        <div className="ui-card flex items-center justify-between rounded-2xl px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Gift size={18} /></span>
            <div>
              <p className="text-sm font-extrabold">Referral earnings</p>
              <p className="text-xs text-muted-foreground">{financial.totalReferrals} referrals — ${financial.referralEarnings.toFixed(2)} earned</p>
            </div>
          </div>
          <Link href="/referrals" className="text-xs font-bold text-primary hover:underline">View details</Link>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr]">
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold tracking-tight">Recent account activity</h2>
              <p className="mt-1 text-xs text-muted-foreground">Security and account events only.</p>
            </div>
            <Link href="/activity" className="text-xs font-bold text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-5 flex flex-col gap-2">
            {(summary?.recentActivity ?? []).length > 0 ? (
              summary?.recentActivity.map((item, index) => (
                <div key={`${item.action}-${item.created_at}-${index}`} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Clock3 size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{readableAction(item.action)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted-foreground">
                No account activity yet.
              </p>
            )}
          </div>
        </section>

        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-base font-extrabold tracking-tight">Quick actions</h2>
          <p className="mt-1 text-xs text-muted-foreground">Manage your finances and account.</p>
          <div className="mt-5 flex flex-col gap-2.5">
            {actionCards.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm font-bold transition hover:border-primary/40 hover:text-primary"
                >
                  <span className="flex items-center gap-3">
                    <Icon size={16} className="text-primary" />
                    {action.label}
                  </span>
                  <span aria-hidden>→</span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
