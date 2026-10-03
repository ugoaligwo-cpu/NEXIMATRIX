"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit3, Trash2, Eye, EyeOff, Info, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";
const labelClass = "text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground";

type InfoBox = {
  id: number;
  title: string;
  message: string;
  box_type: string;
  display_location: string;
  is_visible: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

const typeConfig: Record<string, { icon: typeof Info; color: string }> = {
  info: { icon: Info, color: "text-primary bg-primary/10" },
  warning: { icon: AlertTriangle, color: "text-warning bg-warning/10" },
  success: { icon: CheckCircle2, color: "text-success bg-success/10" },
  danger: { icon: XCircle, color: "text-danger bg-danger/10" },
};

export function InfoBoxes() {
  const [boxes, setBoxes] = useState<InfoBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InfoBox | null>(null);
  const [form, setForm] = useState({
    title: "",
    message: "",
    box_type: "info",
    display_location: "dashboard",
    is_visible: true,
    starts_at: "",
    ends_at: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadBoxes = useCallback(async () => {
    setLoading(true);
    try {
      const result = await phpApi.adminInfoBoxes();
      setBoxes(result.boxes as unknown as InfoBox[]);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoxes();
  }, [loadBoxes]);

  const resetForm = () => {
    setShowForm(false); setEditing(null);
    setForm({ title: "", message: "", box_type: "info", display_location: "dashboard", is_visible: true, starts_at: "", ends_at: "" });
    setError("");
  };

  const startEdit = (box: InfoBox) => {
    setEditing(box); setShowForm(true);
    setForm({
      title: box.title,
      message: box.message,
      box_type: box.box_type,
      display_location: box.display_location,
      is_visible: Boolean(box.is_visible),
      starts_at: box.starts_at ?? "",
      ends_at: box.ends_at ?? "",
    });
    setError(""); setSuccess("");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      if (editing) {
        await phpApi.adminUpdateInfoBox(editing.id, form);
        setSuccess("Info box updated.");
      } else {
        await phpApi.adminCreateInfoBox(form);
        setSuccess("Info box created.");
      }
      resetForm();
      loadBoxes();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this info box?")) return;
    try {
      await phpApi.adminDeleteInfoBox(id);
      setSuccess("Info box deleted.");
      loadBoxes();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete.");
    }
  };

  const toggleVisibility = async (box: InfoBox) => {
    try {
      await phpApi.adminUpdateInfoBox(box.id, { ...form, is_visible: !box.is_visible });
      loadBoxes();
    } catch { /* silent */ }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading info boxes...</p>;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Settings</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Info Box Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">Create and manage user-facing announcements and information boxes.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90">
          <Plus size={16} /> Create Info Box
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      {showForm && (
        <form onSubmit={save} className="ui-card flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">{editing ? "Edit Info Box" : "New Info Box"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Title
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${inputClass} mt-1.5`} required />
            </label>
            <label className={labelClass}>
              Type
              <select value={form.box_type} onChange={(e) => setForm({ ...form, box_type: e.target.value })} className={`${inputClass} mt-1.5`}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="danger">Danger</option>
              </select>
            </label>
          </div>
          <label className={labelClass}>
            Message
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="min-h-24 w-full rounded-xl border border-line bg-surface-2/60 p-3.5 text-sm outline-none focus:border-primary" required />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className={labelClass}>
              Display Location
              <select value={form.display_location} onChange={(e) => setForm({ ...form, display_location: e.target.value })} className={`${inputClass} mt-1.5`}>
                <option value="dashboard">Dashboard</option>
                <option value="all_pages">All Pages</option>
                <option value="login_page">Login Page</option>
                <option value="register_page">Register Page</option>
              </select>
            </label>
            <label className={labelClass}>
              Start Date (optional)
              <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
            <label className={labelClass}>
              End Date (optional)
              <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-line p-4">
            <input type="checkbox" checked={form.is_visible} onChange={(e) => setForm({ ...form, is_visible: e.target.checked })} className="size-5 accent-primary" />
            <div>
              <p className="text-sm font-bold">Visible</p>
              <p className="text-xs text-muted-foreground">Show this info box to users</p>
            </div>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-muted-foreground">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      )}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {boxes.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No info boxes yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {boxes.map((box) => {
              const config = typeConfig[box.box_type] ?? typeConfig.info;
              const Icon = config.icon;
              return (
                <div key={box.id} className="flex items-center justify-between gap-4 rounded-xl border border-line p-4">
                  <div className="flex items-center gap-3">
                    <span className={`grid size-10 place-items-center rounded-xl ${config.color}`}>
                      <Icon size={18} />
                    </span>
                    <div>
                      <p className="font-bold">{box.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{box.message}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        {box.display_location.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${box.is_visible ? "bg-success/10 text-success" : "bg-muted-foreground/10 text-muted-foreground"}`}>
                      {box.is_visible ? "Visible" : "Hidden"}
                    </span>
                    <button onClick={() => toggleVisibility(box)} className="grid size-8 place-items-center rounded-lg border border-line text-muted-foreground hover:border-primary/40 hover:text-primary" title={box.is_visible ? "Hide" : "Show"}>
                      {box.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button onClick={() => startEdit(box)} className="grid size-8 place-items-center rounded-lg border border-line text-muted-foreground hover:border-primary/40 hover:text-primary" title="Edit">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => remove(box.id)} className="grid size-8 place-items-center rounded-lg border border-danger/30 text-danger hover:border-danger" title="Delete">
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
