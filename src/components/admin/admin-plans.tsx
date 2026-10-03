"use client";

import { useState, useEffect } from "react";
import { Plus, Edit3, Power } from "lucide-react";
import { phpApi, ApiError, InvestmentPlan } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

const labelClass = "text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground";

export function AdminPlansView() {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InvestmentPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    min_deposit: "",
    max_deposit: "",
    daily_return: "",
    duration_days: "",
    total_return: "",
    sort_order: "0",
  });

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const result = await phpApi.adminInvestmentPlans();
        if (active) setPlans(result.plans);
      } catch {
        if (active) setError("Failed to load plans.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const resetForm = () => {
    setForm({ name: "", description: "", min_deposit: "", max_deposit: "", daily_return: "", duration_days: "", total_return: "", sort_order: "0" });
    setEditingPlan(null);
    setShowForm(false);
  };

  const startEdit = (plan: InvestmentPlan) => {
    setForm({
      name: plan.name,
      description: plan.description ?? "",
      min_deposit: String(plan.min_deposit),
      max_deposit: String(plan.max_deposit),
      daily_return: String(plan.daily_return),
      duration_days: String(plan.duration_days),
      total_return: String(plan.total_return),
      sort_order: String(plan.sort_order),
    });
    setEditingPlan(plan);
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        min_deposit: parseFloat(form.min_deposit),
        max_deposit: parseFloat(form.max_deposit),
        daily_return: parseFloat(form.daily_return),
        duration_days: parseInt(form.duration_days, 10),
        total_return: parseFloat(form.total_return),
        sort_order: parseInt(form.sort_order, 10),
      };
      if (editingPlan) {
        await phpApi.adminUpdatePlan(editingPlan.id, payload);
        setSuccess("Plan updated.");
      } else {
        await phpApi.adminCreatePlan(payload);
        setSuccess("Plan created.");
      }
      resetForm();
      const result = await phpApi.adminInvestmentPlans();
      setPlans(result.plans);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (plan: InvestmentPlan) => {
    try {
      await phpApi.adminUpdatePlan(plan.id, { is_active: !plan.is_active });
      const result = await phpApi.adminInvestmentPlans();
      setPlans(result.plans);
    } catch {
      setError("Failed to update plan.");
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Administration</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Investment Plans</h1>
          <p className="mt-2 text-sm text-muted-foreground">Create and manage investment plans for your users.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary/90"
        >
          <Plus size={16} /> New Plan
        </button>
      </header>

      {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      {success ? <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p> : null}

      {showForm ? (
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">{editingPlan ? "Edit Plan" : "Create Plan"}</h2>
          <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className={labelClass}>
              Plan Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${inputClass} mt-1.5`} required maxLength={80} />
            </label>
            <label className={labelClass}>
              Description
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} mt-1.5`} maxLength={255} />
            </label>
            <label className={labelClass}>
              Sort Order
              <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
            <label className={labelClass}>
              Min Deposit ($)
              <input type="number" min="0" step="0.01" value={form.min_deposit} onChange={(e) => setForm({ ...form, min_deposit: e.target.value })} className={`${inputClass} mt-1.5`} required />
            </label>
            <label className={labelClass}>
              Max Deposit ($)
              <input type="number" min="0" step="0.01" value={form.max_deposit} onChange={(e) => setForm({ ...form, max_deposit: e.target.value })} className={`${inputClass} mt-1.5`} required />
            </label>
            <label className={labelClass}>
              Daily Return (%)
              <input type="number" min="0" step="0.01" value={form.daily_return} onChange={(e) => setForm({ ...form, daily_return: e.target.value })} className={`${inputClass} mt-1.5`} required />
            </label>
            <label className={labelClass}>
              Duration (days)
              <input type="number" min="1" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} className={`${inputClass} mt-1.5`} required />
            </label>
            <label className={labelClass}>
              Total Return (%)
              <input type="number" min="0" step="0.01" value={form.total_return} onChange={(e) => setForm({ ...form, total_return: e.target.value })} className={`${inputClass} mt-1.5`} required />
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={submitting} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60">
                {submitting ? "Saving…" : editingPlan ? "Update Plan" : "Create Plan"}
              </button>
              <button type="button" onClick={resetForm} className="inline-flex h-10 items-center justify-center rounded-xl border border-line px-5 text-sm font-bold text-muted-foreground transition hover:border-primary/40">
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading plans…</p>
        ) : plans.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No plans yet. Create your first plan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Range</th>
                  <th className="pb-3">Daily</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Total Return</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-line/50 last:border-0">
                    <td className="py-3">
                      <p className="font-bold">{plan.name}</p>
                      {plan.description ? <p className="text-xs text-muted-foreground">{plan.description}</p> : null}
                    </td>
                    <td className="py-3">${plan.min_deposit.toFixed(0)} – ${plan.max_deposit.toFixed(0)}</td>
                    <td className="py-3 font-bold text-primary">{plan.daily_return}%</td>
                    <td className="py-3">{plan.duration_days} days</td>
                    <td className="py-3 font-bold text-success">{plan.total_return}%</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${plan.is_active ? "bg-success/10 text-success" : "bg-muted-foreground/10 text-muted-foreground"}`}>
                        {plan.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => startEdit(plan)} className="grid size-8 place-items-center rounded-lg border border-line text-muted-foreground transition hover:border-primary/40 hover:text-primary" title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => toggleActive(plan)} className={`grid size-8 place-items-center rounded-lg border transition ${plan.is_active ? "border-warning/30 text-warning hover:border-warning" : "border-success/30 text-success hover:border-success"}`} title={plan.is_active ? "Deactivate" : "Activate"}>
                          <Power size={14} />
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
