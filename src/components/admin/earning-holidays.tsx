"use client";

import { useState, useEffect } from "react";
import { Plus, Calendar } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

type Holiday = {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  is_active: number;
  created_at: string;
};

export function EarningHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", start_date: "", end_date: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const result = await phpApi.adminEarningHolidays();
      setHolidays(result.holidays as unknown as Holiday[]);
    } catch {
      setError("Failed to load holidays.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHolidays(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      await phpApi.adminCreateEarningHoliday(form);
      setSuccess("Holiday created.");
      setForm({ name: "", description: "", start_date: "", end_date: "" });
      setShowForm(false);
      loadHolidays();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create holiday.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="py-16 text-center text-sm text-muted-foreground">Loading holidays...</p>;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Settings</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Earning Holidays</h1>
          <p className="mt-2 text-sm text-muted-foreground">Configure demo activity schedules. No actual financial earnings are generated.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90">
          <Plus size={16} /> Add Holiday
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      {showForm && (
        <form onSubmit={save} className="ui-card flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">New Holiday</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${inputClass} mt-1.5`} required />
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Description
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Start Date
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={`${inputClass} mt-1.5`} required />
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              End Date
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={`${inputClass} mt-1.5`} required />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-muted-foreground">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Create"}</button>
          </div>
        </form>
      )}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {holidays.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No holidays configured.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {holidays.map((holiday) => (
              <div key={holiday.id} className="flex items-center justify-between gap-4 rounded-xl border border-line p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Calendar size={18} />
                  </span>
                  <div>
                    <p className="font-bold">{holiday.name}</p>
                    <p className="text-xs text-muted-foreground">{holiday.start_date} — {holiday.end_date}</p>
                    {holiday.description && <p className="mt-1 text-xs text-muted-foreground">{holiday.description}</p>}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${holiday.is_active ? "bg-success/10 text-success" : "bg-muted-foreground/10 text-muted-foreground"}`}>
                  {holiday.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
