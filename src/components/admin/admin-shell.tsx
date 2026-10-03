"use client";

import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  Calendar,
  Clock,
  Coins,
  CreditCard,
  Database,
  DollarSign,
  FileText,
  Gift,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  TrendingUp,
  Upload,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "@/components/providers/session-provider";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const navGroups: Array<{
  label: string;
  items: Array<{ label: string; href: string; icon: typeof LayoutDashboard }>;
}> = [
  {
    label: "Dashboard",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "System Status", href: "/admin/system", icon: ShieldCheck },
      { label: "Activity Logs", href: "/admin/activity", icon: Activity },
    ],
  },
  {
    label: "Plans",
    items: [
      { label: "Investment Programs", href: "/admin/finance/plans", icon: TrendingUp },
      { label: "Expiring Deposits", href: "/admin/plans/expiring-deposits", icon: Clock },
    ],
  },
  {
    label: "Users",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Accounts Blacklist", href: "/admin/users/blacklist", icon: ShieldOff },
      { label: "Top Referral Earnings", href: "/admin/settings/referral", icon: Gift },
    ],
  },
  {
    label: "Transactions",
    items: [
      { label: "Transactions", href: "/admin/records/transactions", icon: ArrowDownToLine },
      { label: "Withdrawal Requests", href: "/admin/transactions/withdrawal-requests", icon: ArrowUpFromLine },
      { label: "Add Funds", href: "/admin/transactions/add-funds", icon: DollarSign },
      { label: "Deposits", href: "/admin/finance/deposits", icon: ArrowDownToLine },
      { label: "Withdrawals", href: "/admin/finance/withdrawals", icon: ArrowUpFromLine },
      { label: "Earnings", href: "/admin/transactions/earnings", icon: Coins },
      { label: "Referral", href: "/admin/settings/referral", icon: Gift },
      { label: "Exchange", href: "/admin/settings/exchange-rates", icon: DollarSign },
      { label: "Pending Deposits", href: "/admin/transactions/pending-deposits", icon: Clock },
      { label: "Add Bonus", href: "/admin/transactions/bonus-records", icon: Gift },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Tickets", href: "/admin/support", icon: LifeBuoy },
    ],
  },
  {
    label: "Notifications",
    items: [
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Homepage", href: "/admin/content/homepage", icon: LayoutDashboard },
      { label: "Pages", href: "/admin/content/pages", icon: FileText },
      { label: "News", href: "/admin/content/news", icon: FileText },
      { label: "FAQ", href: "/admin/content/faq", icon: FileText },
      { label: "Banners", href: "/admin/content/banners", icon: Megaphone },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Settings", href: "/admin/settings/general", icon: Settings },
      { label: "Processings", href: "/admin/settings/payment-methods", icon: CreditCard },
      { label: "Auto-Withdrawals Settings", href: "/admin/settings/auto-withdrawal", icon: Settings },
      { label: "Referral Settings", href: "/admin/settings/referral", icon: Users },
      { label: "Email Logs", href: "/admin/email/logs", icon: Mail },
      { label: "Security", href: "/admin/security/settings", icon: ShieldAlert },
      { label: "Earning Holidays", href: "/admin/settings/earning-holidays", icon: Calendar },
      { label: "Info Box Settings", href: "/admin/settings/info-boxes", icon: Megaphone },
      { label: "Exchange Rates", href: "/admin/settings/exchange-rates", icon: DollarSign },
    ],
  },
  {
    label: "System",
    items: [
      { label: "System Info", href: "/admin/system/info", icon: Database },
      { label: "Diagnostics", href: "/admin/system/diagnostics", icon: Activity },
      { label: "Logs", href: "/admin/system/logs", icon: Activity },
      { label: "Backup", href: "/admin/system/backup", icon: Database },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Newsletters", href: "/admin/communication/newsletters", icon: Mail },
      { label: "Contact Form", href: "/admin/communication/contact", icon: Mail },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Admin Accounts", href: "/admin/administration/admins", icon: Users },
      { label: "Roles", href: "/admin/administration/roles", icon: ShieldAlert },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "HYIP Import", href: "/admin/setup", icon: Upload },
    ],
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !user.roles.some((role) => role === "admin" || role === "super_admin"))) {
      router.replace("/admin/login");
    }
  }, [loading, router, user]);

  if (loading || !user || !user.roles.some((role) => role === "admin" || role === "super_admin")) {
    return (
      <div className="grid min-h-screen place-items-center bg-shell text-sm font-semibold text-muted-foreground">
        Checking administrator access...
      </div>
    );
  }

  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  const signOut = async () => {
    await logout();
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-screen w-full bg-shell text-foreground">
      <header className="sticky top-0 z-40 border-b border-line bg-[var(--shell)]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-[92%] max-w-[1440px] items-center justify-between gap-3 md:h-[72px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              className="grid size-10 place-items-center rounded-xl border border-line text-muted-foreground lg:hidden"
              aria-label="Toggle admin navigation"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Logo href="/admin" compact />
            <div className="hidden sm:block">
              <p className="text-sm font-extrabold">Admin workspace</p>
              <p className="text-xs text-muted-foreground">Manage users, content, and settings</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard"
              className="hidden rounded-xl border border-line px-3 py-2 text-xs font-bold text-muted-foreground hover:border-primary/40 hover:text-primary sm:inline-flex"
            >
              User panel
            </Link>
            <span className="hidden items-center gap-2 rounded-full border border-line px-3 py-2 text-xs font-bold text-muted-foreground sm:inline-flex">
              <span className="grid size-6 place-items-center rounded-full bg-primary text-[9px] text-white">
                {initials(user.fullName)}
              </span>
              {user.fullName}
            </span>
            <ThemeToggle className="size-10" />
            <button
              type="button"
              onClick={signOut}
              className="grid size-10 place-items-center rounded-xl border border-line text-muted-foreground hover:border-danger/40 hover:text-danger"
              aria-label="Logout"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed bottom-0 left-0 top-16 z-30 hidden w-64 flex-col overflow-y-auto border-r border-line bg-[var(--shell)] p-4 lg:top-[72px] lg:flex">
        <nav className="flex flex-col gap-4" aria-label="Admin navigation">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition",
                        active
                          ? "bg-primary/12 text-primary"
                          : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                      )}
                    >
                      <Icon size={17} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="mt-auto rounded-xl border border-line p-3">
          <p className="text-xs font-bold">Secure admin access</p>
          <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
            All admin actions are authorized by the PHP backend.
          </p>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-label="Close admin navigation"
          />
          <aside className="absolute bottom-0 left-0 top-16 w-[min(86%,320px)] overflow-y-auto border-r border-line bg-[var(--shell)] p-4 shadow-2xl">
            <div className="flex items-center justify-between px-2">
              <p className="text-sm font-extrabold">Administration</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid size-9 place-items-center rounded-xl border border-line"
                aria-label="Close navigation"
              >
                <X size={17} />
              </button>
            </div>
            <nav className="mt-4 flex flex-col gap-4">
              {navGroups.map((group) => (
                <div key={group.label}>
                  <p className="mb-1 px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold",
                            active
                              ? "bg-primary/12 text-primary"
                              : "text-muted-foreground hover:bg-surface-2"
                          )}
                        >
                          <Icon size={17} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}

      <main className="pb-10 lg:pl-64">
        <div className="mx-auto w-[92%] max-w-[1440px] py-7 md:py-9">{children}</div>
      </main>
    </div>
  );
}
