"use client";

import { useState, useEffect } from "react";
import { Save, Users, Link, Shield, Mail, Award } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";
const labelClass = "text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground";

type SettingsMap = Record<string, { value: string; type: string; updated_at: string }>;
type Stats = {
  totalReferrals: number;
  activeReferrers: number;
  totalReferredUsers: number;
  totalEarned: number;
  topReferrers: Array<{ username: string; count: number; earned: number }>;
  recentReferrals: Array<{ id: number; referrer: string; referred: string; created_at: string }>;
};

export function ReferralSettings() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [settingsRes, statsRes] = await Promise.all([
          phpApi.adminGetAllSettings(),
          phpApi.adminReferralStats(),
        ]);
        if (active) {
          const refSettings: SettingsMap = {};
          for (const [key, data] of Object.entries(settingsRes.settings)) {
            if (key.startsWith("referral_")) {
              refSettings[key] = data as unknown as { value: string; type: string; updated_at: string };
            }
          }
          setSettings(refSettings);
          setStats(statsRes.stats as unknown as Stats);
        }
      } catch { /* silent */ } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const setVal = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: { ...prev[key], value } }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      const values: Record<string, string> = {};
      for (const [key, data] of Object.entries(settings)) {
        values[key] = data.value;
      }
      await phpApi.adminUpdateReferralSettings(values);
      setSuccess("Referral settings saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading referral settings...</p>;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Settings</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Referral Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Configure referral program display, attribution, and demo points. No cash commissions or monetary rewards.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Total Referrals</p>
          <p className="mt-1 text-2xl font-extrabold text-primary">{stats?.totalReferrals ?? 0}</p>
        </div>
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Active Referrers</p>
          <p className="mt-1 text-2xl font-extrabold text-success">{stats?.activeReferrers ?? 0}</p>
        </div>
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Referred Users</p>
          <p className="mt-1 text-2xl font-extrabold text-violet-500">{stats?.totalReferredUsers ?? 0}</p>
        </div>
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Demo Points Earned</p>
          <p className="mt-1 text-2xl font-extrabold text-warning">{stats?.totalEarned.toFixed(0) ?? 0}</p>
        </div>
      </div>

      <form onSubmit={save} className="flex flex-col gap-5">
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><Link size={17} className="text-primary" /> General</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-line p-4">
              <input
                type="checkbox"
                checked={settings.referral_enabled?.value === "1"}
                onChange={(e) => setVal("referral_enabled", e.target.checked ? "1" : "0")}
                className="size-5 accent-primary"
              />
              <div>
                <p className="text-sm font-bold">Enable Referral Program</p>
                <p className="text-xs text-muted-foreground">Allow users to refer others</p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-line p-4">
              <input
                type="checkbox"
                checked={settings.referral_link_display?.value === "1"}
                onChange={(e) => setVal("referral_link_display", e.target.checked ? "1" : "0")}
                className="size-5 accent-primary"
              />
              <div>
                <p className="text-sm font-bold">Show Referral Links</p>
                <p className="text-xs text-muted-foreground">Display referral links on user dashboard</p>
              </div>
            </label>
            <label className={labelClass}>
              Referral Code Format
              <select value={settings.referral_code_format?.value ?? "username"} onChange={(e) => setVal("referral_code_format", e.target.value)} className={`${inputClass} mt-1.5`}>
                <option value="username">Username</option>
                <option value="random">Random Code</option>
                <option value="user_id">User ID</option>
              </select>
            </label>
            <label className={labelClass}>
              Attribution Method
              <select value={settings.referral_attribution?.value ?? "first_click"} onChange={(e) => setVal("referral_attribution", e.target.value)} className={`${inputClass} mt-1.5`}>
                <option value="first_click">First Click</option>
                <option value="last_click">Last Click</option>
                <option value="registration">Registration</option>
              </select>
            </label>
          </div>
        </section>

        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><Shield size={17} className="text-primary" /> Privacy & Terms</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Privacy Level
              <select value={settings.referral_privacy?.value ?? "show_username"} onChange={(e) => setVal("referral_privacy", e.target.value)} className={`${inputClass} mt-1.5`}>
                <option value="show_username">Show Username</option>
                <option value="show_initials">Show Initials Only</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>
          </div>
          <label className={`${labelClass} mt-4`}>
            Referral Terms & Explanatory Content
            <textarea
              value={settings.referral_terms?.value ?? ""}
              onChange={(e) => setVal("referral_terms", e.target.value)}
              className="min-h-24 w-full rounded-xl border border-line bg-surface-2/60 p-3.5 text-sm outline-none focus:border-primary"
            />
          </label>
        </section>

        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><Award size={17} className="text-primary" /> Demo Points (No Cash Value)</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className={labelClass}>
              Demo Points per Referral
              <input type="number" min="0" value={settings.referral_demo_points?.value ?? "100"} onChange={(e) => setVal("referral_demo_points", e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <label className={labelClass}>
              Max Referral Levels
              <input type="number" min="1" max="10" value={settings.referral_max_levels?.value ?? "1"} onChange={(e) => setVal("referral_max_levels", e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <label className={labelClass}>
              Commission Rate (%)
              <input type="number" min="0" max="100" step="0.01" value={settings.referral_commission_rate?.value ?? "0"} onChange={(e) => setVal("referral_commission_rate", e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
          </div>
          <p className="mt-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-warning">
            Demo points have no cash value and cannot be redeemed, withdrawn, or exchanged for money.
          </p>
        </section>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60">
            <Save size={16} /> {saving ? "Saving..." : "Save Referral Settings"}
          </button>
        </div>
      </form>

      {stats && stats.topReferrers.length > 0 && (
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><Users size={17} className="text-primary" /> Top Referrers</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr><th className="pb-3">User</th><th className="pb-3">Referrals</th><th className="pb-3">Demo Points Earned</th></tr>
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
        </section>
      )}
    </div>
  );
}
