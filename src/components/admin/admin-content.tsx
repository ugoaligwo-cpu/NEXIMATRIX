"use client";

import { FileText, Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, phpApi } from "@/lib/php-api";

const inputClass = "w-full rounded-xl border border-line bg-surface-2/60 px-3.5 text-sm outline-none focus:border-primary";

type Settings = Record<string, string>;

function settingsToMap(settings: Array<Record<string, unknown>>): Settings {
  return Object.fromEntries(settings.map((item) => [String(item.setting_key), String(item.setting_value ?? "")]));
}

export function AdminContent() {
  const [settings, setSettings] = useState<Settings>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    phpApi.adminContent().then((result) => setSettings(settingsToMap(result.settings))).catch(() => setError("Website settings could not be loaded.")).finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) => setSettings((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const result = await phpApi.updateAdminContent({
        support_email: settings.support_email ?? "",
        support_phone: settings.support_phone ?? "",
        announcement: settings.announcement ?? "",
        about_text: settings.about_text ?? "",
      });
      setSettings(settingsToMap(result.settings));
      setSuccess("Website settings saved.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Website settings could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="py-16 text-center text-sm text-muted-foreground">Loading settings…</p>;

  return <div className="flex flex-col gap-7"><header><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Administration</p><h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Content</h1><p className="mt-2 text-sm text-muted-foreground">Manage a small allowlist of public support and announcement text.</p></header>{error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}{success ? <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p> : null}<form onSubmit={submit} className="ui-card max-w-3xl rounded-2xl p-5 sm:p-7"><div className="flex items-center gap-3\"><FileText size={19} className="text-primary" /><div><h2 className="text-lg font-extrabold">Website settings</h2><p className="text-xs text-muted-foreground">Only these fields can be changed from the admin panel.</p></div></div><div className="mt-6 flex flex-col gap-5"><label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Support email<input type="email" value={settings.support_email ?? ""} onChange={(event) => update("support_email", event.target.value)} className={`mt-2 ${inputClass}`} /></label><label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Support phone<input value={settings.support_phone ?? ""} onChange={(event) => update("support_phone", event.target.value)} className={`mt-2 ${inputClass}`} /></label><label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Announcement<textarea value={settings.announcement ?? ""} onChange={(event) => update("announcement", event.target.value)} className={`mt-2 min-h-24 ${inputClass} py-3`} maxLength={5000} /></label><label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">About text<textarea value={settings.about_text ?? ""} onChange={(event) => update("about_text", event.target.value)} className={`mt-2 min-h-32 ${inputClass} py-3`} maxLength={5000} /></label><button type="submit" disabled={saving} className="inline-flex h-10 w-fit items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white disabled:opacity-60"><Save size={15} /> {saving ? "Saving…" : "Save settings"}</button></div></form></div>;
}
