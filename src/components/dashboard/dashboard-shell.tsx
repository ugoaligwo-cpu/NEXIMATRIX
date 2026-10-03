"use client";

import {
  Bell,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Send,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "@/components/providers/session-provider";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Invest", href: "/invest", icon: TrendingUp },
  { label: "Deposit", href: "/deposit", icon: CircleDollarSign },
  { label: "Withdraw", href: "/withdrawal", icon: Send },
  { label: "Activity", href: "/activity", icon: ShieldCheck },
  { label: "Support", href: "/support", icon: UserRound },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/profile", icon: Settings },
];

const mobileOrder = [navigation[0], navigation[1], navigation[2], navigation[3], navigation[4]];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-shell text-sm font-semibold text-muted-foreground">
        Loading your account…
      </div>
    );
  }

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const signOut = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen w-full bg-shell text-foreground">
      <header className="sticky top-0 z-40 w-full border-b border-line bg-[var(--shell)]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-[92%] max-w-[1440px] items-center justify-between gap-3 md:h-[72px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="grid size-10 place-items-center rounded-xl border border-line text-muted-foreground md:hidden"
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Logo href="/dashboard" compact />
            <div className="hidden sm:block">
              <p className="text-sm font-extrabold">Account center</p>
              <p className="text-xs text-muted-foreground">Manage your profile and support</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <Link
              href="/notifications"
              className="relative grid size-10 place-items-center rounded-xl border border-line text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              aria-label="Notifications"
            >
              <Bell size={17} />
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-2.5 rounded-full border border-line bg-card py-1.5 pl-1.5 pr-3 transition hover:border-primary/40"
            >
              <span className="grid size-8 place-items-center rounded-full bg-primary text-[11px] font-extrabold text-white">
                {initials(user.fullName)}
              </span>
              <span className="hidden max-w-32 truncate text-sm font-extrabold text-primary sm:block">
                {user.fullName}
              </span>
            </Link>
            <ThemeToggle className="size-10" />
          </div>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-16 z-30 hidden w-[88px] flex-col items-center justify-between border-r border-line bg-[var(--shell)] py-6 md:top-[72px] md:flex">
        <div className="grid size-11 place-items-center rounded-xl">
          <Logo href="/dashboard" compact />
        </div>
        <nav className="flex flex-col items-center gap-1.5" aria-label="Account navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className="group flex flex-col items-center gap-1"
              >
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-xl transition-all duration-300",
                    active
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground group-hover:bg-surface-3/60 group-hover:text-foreground",
                  )}
                >
                  <Icon size={20} />
                </span>
                <span
                  className={cn(
                    "max-w-[74px] truncate text-center text-[10px] font-bold",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={signOut}
          className="grid size-10 place-items-center rounded-xl border border-line text-muted-foreground transition hover:border-danger/40 hover:text-danger"
          aria-label="Logout"
          title="Logout"
        >
          <LogOut size={17} />
        </button>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute bottom-0 left-0 top-16 flex w-[min(86%,320px)] flex-col border-r border-line bg-[var(--shell)] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-extrabold">Account navigation</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid size-9 place-items-center rounded-xl border border-line"
                aria-label="Close navigation"
              >
                <X size={17} />
              </button>
            </div>
            <nav className="mt-7 flex flex-col gap-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold",
                      active
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-transparent text-muted-foreground hover:bg-surface-2",
                    )}
                  >
                    <Icon size={17} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <button
              type="button"
              onClick={signOut}
              className="mt-auto flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm font-bold text-muted-foreground hover:border-danger/40 hover:text-danger"
            >
              <LogOut size={17} /> Logout
            </button>
          </aside>
        </div>
      ) : null}

      <main className="pb-24 md:pb-10 md:pl-[88px]">
        <div className="mx-auto w-[92%] max-w-[1440px] py-7 md:py-9">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-[var(--shell)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="grid w-full grid-cols-8">
          {mobileOrder.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-1 py-2.5"
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-xl",
                    active ? "bg-primary/12 text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon size={18} />
                </span>
                <span className={cn("max-w-full truncate px-1 text-[10px] font-bold", active ? "text-primary" : "text-muted-foreground")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
