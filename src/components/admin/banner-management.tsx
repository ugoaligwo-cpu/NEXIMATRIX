"use client";

import { useState, useEffect } from "react";
import { Plus, Edit3, Trash2, Megaphone, Info, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";
const labelClass = "text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground";

type Banner = {
  id: number;
  title: string;
  message: string;
  banner_type: string;
  is_dismissible: boolean;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
};

const typeConfig: Record<string, { icon: typeof Info; color: string }> = {
  info: { icon: Info, color: "text-primary bg-primary/10" },
  warning: { icon: AlertTriangle, color: "text-warning bg-warning/10" },
  success: { icon: CheckCircle2, color: "text-success bg-success/10" },
  danger: { icon: XCircle, color: "text-danger bg-danger/10" },
};

export function BannerManagement() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState({
    title: "",
    message: "",
    banner_type: "info",
    is_dismissible: true,
    starts_at: "",
    ends_at: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await phpApi.adminBanners();
        if (active) setBanners(r.banners as unknown as Banner[]);
      } catch { /* silent */ } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const resetForm = () => {
    setShowForm(false); setEditing(null);
    setForm({ title: "", message: "", banner_type: "info", is_dismissible: true, starts_at: "", ends_at: "", is_active: true });
    setError("");
  };

  const startEdit = (b: Banner) => {
    setEditing(b); setShowForm(true);
    setForm({
      title: b.title,
      message: b.message,
      banner_type: b.banner_type,
      is_dismissible: b.is_dismissible,
      starts_at: b.starts_at ?? "",
      ends_at: b.ends_at ?? "",
      is_active: b.is_active,
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      if (editing) {
        await phpApi.adminUpdateBanner(editing.id, form);
        setSuccess("Banner updated.");
      } else {
        await phpApi.adminCreateBanner(form);
        setSuccess("Banner created.");
      }
      resetForm();
      const r = await phpApi.adminBanners();
      setBanners(r.banners as unknown as Banner[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this banner?")) return;
    try {
      await phpApi.adminDeleteBanner(id);
      setSuccess("Banner deleted.");
      const r = await phpApi.adminBanners();
      setBanners(r.banners as unknown as Banner[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete.");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading banners...</p>;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Content</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Banner Management</h1>
          <p className="mt-2 text-sm text-muted-foreground">Create and manage site-wide banners and announcements.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90">
          <Plus size={16} /> Create Banner
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      {showForm && (
        <form onSubmit={save} className="ui-card flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">{editing ? "Edit Banner" : "Create Banner"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Title
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${inputClass} mt-1.5`} required />
            </label>
            <label className={labelClass}>
              Type
              <select value={form.banner_type} onChange={(e) => setForm({ ...form, banner_type: e.target.value })} className={`${inputClass} mt-1.5`}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="danger">Danger</option>
              </select>
            </label>
          </div>
          <label className={labelClass}>
            Message
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="min-h-20 w-full rounded-xl border border-line bg-surface-2/60 p-3.5 text-sm outline-none focus:border-primary" required />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Start Date
              <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
            <label className={labelClass}>
              End Date
              <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-3 rounded-xl border border-line p-4">
              <input type="checkbox" checked={form.is_dismissible} onChange={(e) => setForm({ ...form, is_dismissible: e.target.checked })} className="size-5 accent-primary" />
              <div>
                <p className="text-sm font-bold">Dismissible</p>
                <p className="text-xs text-muted-foreground">Users can close this banner</p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-line p-4">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="size-5 accent-primary" />
              <div>
                <p className="text-sm font-bold">Active</p>
                <p className="text-xs text-muted-foreground">Banner is visible</p>
              </div>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-muted-foreground">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      )}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {banners.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No banners yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {banners.map((b) => {
              const config = typeConfig[b.banner_type] ?? typeConfig.info;
              const Icon = config.icon;
              return (
                <div key={b.id} className="flex items-center justify-between gap-4 rounded-xl border border-line p-4">
                  <div className="flex items-center gap-3">
                    <span className={`grid size-10 place-items-center rounded-xl ${config.color}`}>
                      <Icon size={18} />
                    </span>
                    <div>
                      <p className="font-bold">{b.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{b.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${b.is_active ? "bg-success/10 text-success" : "bg-muted-foreground/10 text-muted-foreground"}`}>
                      {b.is_active ? "Active" : "Inactive"}
                    </span>
                    <button onClick={() => startEdit(b)} className="grid size-8 place-items-center rounded-lg border border-line text-muted-foreground hover:border-primary/40 hover:text-primary" title="Edit">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => remove(b.id)} className="grid size-8 place-items-center rounded-lg border border-danger/30 text-danger hover:border-danger" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
