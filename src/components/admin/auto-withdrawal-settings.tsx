"use client";

import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

type SettingsMap = Record<string, { value: string; type: string; description: string }>;

export function AutoWithdrawalSettings() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    phpApi.adminAutoWithdrawalSettings()
      .then((r) => setSettings(r.settings))
      .catch(() => {})
      .finally(() => setLoading(false));
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
      await phpApi.adminUpdateAutoWithdrawalSettings(values);
      setSuccess("Auto-withdrawal settings saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading settings...</p>;

  const groups = [
    { title: "General", keys: ["auto_withdraw_enabled", "auto_withdraw_review_required", "auto_withdraw_notification"] },
    { title: "Limits", keys: ["auto_withdraw_min_amount", "auto_withdraw_max_amount"] },
    { title: "Labels", keys: ["auto_withdraw_status_label"] },
  ];

  const booleanKeys = new Set(["auto_withdraw_enabled", "auto_withdraw_review_required", "auto_withdraw_notification"]);

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Settings</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Auto-Withdrawal Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Configure demo withdrawal workflow. No automated payouts or financial transfers are implemented.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      <form onSubmit={save} className="flex flex-col gap-5">
        {groups.map((group) => (
          <section key={group.title} className="ui-card rounded-2xl p-5 sm:p-6">
            <h2 className="text-base font-extrabold">{group.title}</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {group.keys.filter((k) => settings[k]).map((key) => (
                <label key={key} className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  {booleanKeys.has(key) ? (
                    <select value={settings[key].value} onChange={(e) => setVal(key, e.target.value)} className={`${inputClass} mt-1.5`}>
                      <option value="1">Enabled</option>
                      <option value="0">Disabled</option>
                    </select>
                  ) : (
                    <input value={settings[key].value} onChange={(e) => setVal(key, e.target.value)} className={`${inputClass} mt-1.5`} />
                  )}
                  {settings[key].description && (
                    <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-muted-foreground">{settings[key].description}</span>
                  )}
                </label>
              ))}
            </div>
          </section>
        ))}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60">
            <Save size={16} /> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
