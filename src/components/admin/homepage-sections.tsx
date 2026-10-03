"use client";

import { useState, useEffect } from "react";
import { Layout, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";
const labelClass = "text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground";

type Section = {
  id: number;
  section_key: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  image_path: string | null;
  cta_text: string | null;
  cta_url: string | null;
  display_order: number;
  is_visible: boolean;
  status: string;
  published_at: string | null;
  updated_at: string;
};

export function HomepageSections() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Section | null>(null);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    body: "",
    cta_text: "",
    cta_url: "",
    display_order: 0,
    is_visible: true,
    status: "draft" as "draft" | "published",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await phpApi.adminHomepageSections();
        if (active) setSections(r.sections as unknown as Section[]);
      } catch { /* silent */ } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const startEdit = (s: Section) => {
    setEditing(s);
    setForm({
      title: s.title,
      subtitle: s.subtitle ?? "",
      body: s.body ?? "",
      cta_text: s.cta_text ?? "",
      cta_url: s.cta_url ?? "",
      display_order: s.display_order,
      is_visible: s.is_visible,
      status: s.status as "draft" | "published",
    });
    setError(""); setSuccess("");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      await phpApi.adminUpdateHomepageSection(editing.id, form);
      setSuccess("Section saved.");
      setEditing(null);
      const r = await phpApi.adminHomepageSections();
      setSections(r.sections as unknown as Section[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading sections...</p>;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Content</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Homepage Sections</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage homepage content sections with draft/published workflow.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      {editing && (
        <form onSubmit={save} className="ui-card flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Edit: {editing.title}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Title
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${inputClass} mt-1.5`} required />
            </label>
            <label className={labelClass}>
              Subtitle
              <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
          </div>
          <label className={labelClass}>
            Body
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="min-h-24 w-full rounded-xl border border-line bg-surface-2/60 p-3.5 text-sm outline-none focus:border-primary" />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className={labelClass}>
              CTA Text
              <input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
            <label className={labelClass}>
              CTA URL
              <input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
            <label className={labelClass}>
              Display Order
              <input type="number" min="0" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} className={`${inputClass} mt-1.5`} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-3 rounded-xl border border-line p-4">
              <input type="checkbox" checked={form.is_visible} onChange={(e) => setForm({ ...form, is_visible: e.target.checked })} className="size-5 accent-primary" />
              <div>
                <p className="text-sm font-bold">Visible</p>
                <p className="text-xs text-muted-foreground">Show on homepage</p>
              </div>
            </label>
            <label className={labelClass}>
              Status
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "draft" | "published" })} className={`${inputClass} mt-1.5`}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-muted-foreground">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      )}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {sections.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No sections configured.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sections.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 rounded-xl border border-line p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Layout size={18} />
                  </span>
                  <div>
                    <p className="font-bold">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.section_key} | Order: {s.display_order}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.status === "published" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                    {s.status}
                  </span>
                  {s.is_visible ? <Eye size={14} className="text-success" /> : <EyeOff size={14} className="text-muted-foreground" />}
                  <button onClick={() => startEdit(s)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-primary hover:border-primary/40">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
