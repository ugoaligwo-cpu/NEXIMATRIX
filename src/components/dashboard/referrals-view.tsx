"use client";

import { useState, useEffect } from "react";
import { Gift, Copy, Check, Users, DollarSign, Clock } from "lucide-react";
import { phpApi, Referral } from "@/lib/php-api";

export function ReferralsView() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await phpApi.referrals({ limit: 50 });
        if (active) {
          setReferrals(result.referrals.items);
          setTotalReferrals(result.referrals.stats.totalReferrals);
          setTotalEarned(result.referrals.stats.totalEarned);
        }
      } catch {
        // silent
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const referralLink = typeof window !== "undefined" ? `${window.location.origin}/register` : "";

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Finance</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Referral Program</h1>
        <p className="mt-2 text-sm text-muted-foreground">Invite friends and earn 10% commission on their deposits.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="ui-card rounded-2xl p-5 text-center">
          <span className="mx-auto grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Users size={18} /></span>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Total Referrals</p>
          <p className="mt-1 text-2xl font-extrabold text-primary">{totalReferrals}</p>
        </div>
        <div className="ui-card rounded-2xl p-5 text-center">
          <span className="mx-auto grid size-10 place-items-center rounded-xl bg-success/10 text-success"><DollarSign size={18} /></span>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Total Earned</p>
          <p className="mt-1 text-2xl font-extrabold text-success">${totalEarned.toFixed(2)}</p>
        </div>
        <div className="ui-card rounded-2xl p-5 text-center">
          <span className="mx-auto grid size-10 place-items-center rounded-xl bg-warning/10 text-warning"><Gift size={18} /></span>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Commission Rate</p>
          <p className="mt-1 text-2xl font-extrabold text-warning">10%</p>
        </div>
      </div>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">Your Referral Link</h2>
        <p className="mt-1 text-sm text-muted-foreground">Share this link with friends to earn commission on their deposits.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex h-11 flex-1 items-center rounded-xl border border-line bg-surface-2/60 px-3.5 text-sm text-muted-foreground">
            {referralLink || "Loading…"}
          </div>
          <button
            onClick={copyLink}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary/90"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </section>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">Your Referrals</h2>
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading referrals…</p>
        ) : referrals.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No referrals yet. Share your link to get started.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Username</th>
                  <th className="pb-3">Joined</th>
                  <th className="pb-3">Commission</th>
                  <th className="pb-3">Earned</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((ref) => (
                  <tr key={ref.id} className="border-b border-line/50 last:border-0">
                    <td className="py-3 font-bold">{ref.full_name}</td>
                    <td className="py-3 text-muted-foreground">@{ref.username}</td>
                    <td className="py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock size={12} /> {new Date(ref.joined_at).toLocaleDateString()}</span>
                    </td>
                    <td className="py-3">{(ref.commission_rate * 100).toFixed(0)}%</td>
                    <td className="py-3 font-bold text-success">${ref.total_earned.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
