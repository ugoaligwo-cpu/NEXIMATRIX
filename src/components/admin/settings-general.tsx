"use client";

import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";
const labelClass = "text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground";

type SettingsMap = Record<string, { value: string; type: string; public: boolean }>;

export function SettingsGeneral() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    phpApi.adminGetAllSettings()
      .then((r) => setSettings(r.settings))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      const values: Record<string, string> = {};
      for (const [key, data] of Object.entries(settings)) {
        values[key] = data.value;
      }
      const result = await phpApi.adminUpdateSettings(values);
      setSettings(result.settings);
      setSuccess("Settings saved successfully.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const setVal = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: { ...prev[key], value } }));
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading settings...</p>;

  const groups = [
    {
      title: "General",
      keys: ["site_name", "site_tagline", "site_description"],
    },
    {
      title: "SEO",
      keys: ["meta_title", "meta_description"],
    },
    {
      title: "Localization",
      keys: ["timezone", "date_format", "time_format"],
    },
    {
      title: "Registration",
      keys: ["registration_enabled", "registration_email_verification"],
    },
    {
      title: "Security",
      keys: ["session_timeout_minutes", "max_login_attempts", "lockout_duration_minutes", "password_min_length"],
    },
    {
      title: "Social Links",
      keys: ["facebook_url", "twitter_url", "instagram_url", "linkedin_url", "youtube_url"],
    },
    {
      title: "Footer",
      keys: ["footer_copyright", "footer_text"],
    },
  ];

  const booleanKeys = new Set(["registration_enabled", "registration_email_verification", "maintenance_enabled"]);

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Settings</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">General Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">Configure website name, SEO, localization, and security.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      <form onSubmit={update} className="flex flex-col gap-5">
        {groups.map((group) => (
          <section key={group.title} className="ui-card rounded-2xl p-5 sm:p-6">
            <h2 className="text-base font-extrabold">{group.title}</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {group.keys.filter((k) => settings[k]).map((key) => (
                <label key={key} className={labelClass}>
                  {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  {booleanKeys.has(key) ? (
                    <select value={settings[key].value} onChange={(e) => setVal(key, e.target.value)} className={`${inputClass} mt-1.5`}>
                      <option value="1">Enabled</option>
                      <option value="0">Disabled</option>
                    </select>
                  ) : (
                    <input value={settings[key].value} onChange={(e) => setVal(key, e.target.value)} className={`${inputClass} mt-1.5`} />
                  )}
                </label>
              ))}
            </div>
          </section>
        ))}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60">
            <Save size={16} /> {saving ? "Saving..." : "Save All Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
