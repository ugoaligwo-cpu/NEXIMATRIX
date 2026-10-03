"use client";

import { useState, useEffect } from "react";
import { Plus, Edit3, Trash2, Power, Eye, Gift } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";
const labelClass = "text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground";

type Bonus = {
  id: number;
  title: string;
  description: string | null;
  badge_label: string | null;
  demo_points: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  eligibility_description: string | null;
  user_terms: string | null;
  created_at: string;
  updated_at: string;
};

export function BonusManagement() {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Bonus | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    badge_label: "",
    demo_points: "0",
    is_active: true,
    starts_at: "",
    ends_at: "",
    eligibility_description: "",
    user_terms: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await phpApi.adminBonuses();
        if (active) setBonuses(r.bonuses as unknown as Bonus[]);
      } catch { /* silent */ } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const resetForm = () => {
    setShowForm(false); setEditing(null);
    setForm({ title: "", description: "", badge_label: "", demo_points: "0", is_active: true, starts_at: "", ends_at: "", eligibility_description: "", user_terms: "" });
    setError("");
  };

  const startEdit = (b: Bonus) => {
    setEditing(b); setShowForm(true);
    setForm({
      title: b.title,
      description: b.description ?? "",
      badge_label: b.badge_label ?? "",
      demo_points: String(b.demo_points),
      is_active: b.is_active,
      starts_at: b.starts_at ?? "",
      ends_at: b.ends_at ?? "",
      eligibility_description: b.eligibility_description ?? "",
      user_terms: b.user_terms ?? "",
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      if (editing) {
        await phpApi.adminUpdateBonus(editing.id, { ...form, demo_points: Number(form.demo_points) });
        setSuccess("Bonus updated.");
      } else {
        await phpApi.adminCreateBonus({ ...form, demo_points: Number(form.demo_points) });
        setSuccess("Bonus created.");
      }
      resetForm();
      const r = await phpApi.adminBonuses();
      setBonuses(r.bonuses as unknown as Bonus[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: number) => {
    try {
      await phpApi.adminToggleBonus(id);
      const r = await phpApi.adminBonuses();
      setBonuses(r.bonuses as unknown as Bonus[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to toggle.");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this bonus?")) return;
    try {
      await phpApi.adminDeleteBonus(id);
      setSuccess("Bonus deleted.");
      const r = await phpApi.adminBonuses();
      setBonuses(r.bonuses as unknown as Bonus[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete.");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading bonuses...</p>;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Settings</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Bonus Management</h1>
          <p className="mt-2 text-sm text-muted-foreground">Create and manage non-cash demo bonuses. No real monetary value.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90">
          <Plus size={16} /> Create Bonus
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-warning">
        <Gift size={14} className="shrink-0" />
        <p>All bonuses are non-cash demo only. Demo points have no monetary value and cannot be redeemed or withdrawn.</p>
      </div>

      {showForm && (
        <form onSubmit={save} className="ui-card flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">{editing ? "Edit Bonus" : "Create Bonus"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Title
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={`${inputClass} mt-1.5`} required />
            </label>
            <label className={labelClass}>
              Badge Label
              <input value={form.badge_label} onChange={(e) => setForm({ ...form, badge_label: e.target.value })} className={`${inputClass} mt-1.5`} placeholder="e.g. Welcome Bonus" />
            </label>
          </div>
          <label className={labelClass}>
            Description
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-20 w-full rounded-xl border border-line bg-surface-2/60 p-3.5 text-sm outline-none focus:border-primary" />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className={labelClass}>
              Demo Points
              <input type="number" min="0" value={form.demo_points} onChange={(e) => setForm({ ...form, demo_points: e.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
            <label className={labelClass}>
              Start Date
              <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
            <label className={labelClass}>
              End Date
              <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
          </div>
          <label className={labelClass}>
            Eligibility Description
            <textarea value={form.eligibility_description} onChange={(e) => setForm({ ...form, eligibility_description: e.target.value })} className="min-h-16 w-full rounded-xl border border-line bg-surface-2/60 p-3.5 text-sm outline-none focus:border-primary" />
          </label>
          <label className={labelClass}>
            User-Facing Terms
            <textarea value={form.user_terms} onChange={(e) => setForm({ ...form, user_terms: e.target.value })} className="min-h-16 w-full rounded-xl border border-line bg-surface-2/60 p-3.5 text-sm outline-none focus:border-primary" />
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-line p-4">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="size-5 accent-primary" />
            <div>
              <p className="text-sm font-bold">Active</p>
              <p className="text-xs text-muted-foreground">Bonus is visible to users</p>
            </div>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-muted-foreground">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      )}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {bonuses.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No bonuses yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Badge</th>
                  <th className="pb-3">Points</th>
                  <th className="pb-3">Dates</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bonuses.map((b) => (
                  <tr key={b.id} className="border-b border-line/50 last:border-0 align-top">
                    <td className="py-3">
                      <p className="font-bold">{b.title}</p>
                      {b.description ? <p className="mt-1 text-xs text-muted-foreground">{b.description}</p> : null}
                    </td>
                    <td className="py-3">
                      {b.badge_label ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{b.badge_label}</span> : "—"}
                    </td>
                    <td className="py-3 text-warning">{b.demo_points} pts</td>
                    <td className="py-3 text-xs text-muted-foreground">
                      {b.starts_at ? new Date(b.starts_at).toLocaleDateString() : "—"} — {b.ends_at ? new Date(b.ends_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${b.is_active ? "bg-success/10 text-success" : "bg-muted-foreground/10 text-muted-foreground"}`}>
                        {b.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => startEdit(b)} className="grid size-8 place-items-center rounded-lg border border-line text-muted-foreground hover:border-primary/40 hover:text-primary" title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => toggle(b.id)} className={`grid size-8 place-items-center rounded-lg border ${b.is_active ? "border-warning/30 text-warning" : "border-success/30 text-success"}`} title={b.is_active ? "Deactivate" : "Activate"}>
                          <Power size={14} />
                        </button>
                        <button onClick={() => remove(b.id)} className="grid size-8 place-items-center rounded-lg border border-danger/30 text-danger hover:border-danger" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
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
