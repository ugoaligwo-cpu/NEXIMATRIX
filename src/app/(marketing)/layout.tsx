import type { ReactNode } from "react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-shell">
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
}
