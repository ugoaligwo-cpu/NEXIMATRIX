"use client";

import { useState, useEffect } from "react";
import { Gift, Users, TrendingUp } from "lucide-react";
import { phpApi } from "@/lib/php-api";

type Referrer = {
  username: string;
  count: number;
  earned: number;
};

type ReferralStats = {
  totalReferrals: number;
  activeReferrers: number;
  totalReferredUsers: number;
  totalEarned: number;
  topReferrers: Referrer[];
  recentReferrals: Array<{ id: number; referrer: string; referred: string; created_at: string }>;
};

export function TopReferrals() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    phpApi.adminReferralStats()
      .then((r) => setStats(r.stats as unknown as ReferralStats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-16 text-center text-sm text-muted-foreground">Loading referral data...</p>;
  if (!stats) return <p className="py-16 text-center text-sm text-muted-foreground">No referral data available.</p>;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Users</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Top Referral Earnings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Referral analytics and top referrers. Demo data only.</p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Total Referrals</p>
          <p className="mt-1 text-2xl font-extrabold text-primary">{stats.totalReferrals}</p>
        </div>
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Active Referrers</p>
          <p className="mt-1 text-2xl font-extrabold text-success">{stats.activeReferrers}</p>
        </div>
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Referred Users</p>
          <p className="mt-1 text-2xl font-extrabold text-violet-500">{stats.totalReferredUsers}</p>
        </div>
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Demo Points Earned</p>
          <p className="mt-1 text-2xl font-extrabold text-warning">{stats.totalEarned.toFixed(0)}</p>
        </div>
      </div>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-extrabold">
          <TrendingUp size={17} className="text-primary" /> Top Referrers
        </h2>
        {stats.topReferrers.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No referrers yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Referrals</th>
                  <th className="pb-3">Demo Points Earned</th>
                </tr>
              </thead>
              <tbody>
                {stats.topReferrers.map((r) => (
                  <tr key={r.username} className="border-b border-line/50 last:border-0">
                    <td className="py-3 font-bold">@{r.username}</td>
                    <td className="py-3">{r.count}</td>
                    <td className="py-3 text-warning">{r.earned.toFixed(0)} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {stats.recentReferrals.length > 0 && (
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold">
            <Users size={17} className="text-primary" /> Recent Referrals
          </h2>
          <div className="mt-4 flex flex-col gap-2">
            {stats.recentReferrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
                <div>
                  <p className="text-sm font-bold">{ref.referrer} → {ref.referred}</p>
                  <p className="text-xs text-muted-foreground">{new Date(ref.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
