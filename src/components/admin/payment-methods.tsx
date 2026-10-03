"use client";

import { useState, useEffect } from "react";
import { Plus, Edit3, Archive, RotateCcw, Eye, CreditCard, Wallet, TestTube } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";
const labelClass = "text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground";

type Method = {
  id: number;
  method_key: string;
  display_name: string;
  description: string | null;
  icon_path: string | null;
  display_order: number;
  is_enabled: boolean;
  is_sandbox: boolean;
  supported_currencies: string | null;
  public_instructions: string | null;
  wallet_address: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const methodIcons: Record<string, typeof CreditCard> = {
  demo_card: CreditCard,
  sandbox_wallet: Wallet,
  test_payment: TestTube,
};

export function PaymentMethods() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Method | null>(null);
  const [form, setForm] = useState<{
    method_key: string;
    display_name: string;
    description: string;
    icon_path: string;
    display_order: number;
    is_enabled: boolean;
    is_sandbox: boolean;
    supported_currencies: string;
    public_instructions: string;
    wallet_address: string;
    status: "active" | "archived";
  }>({
    method_key: "",
    display_name: "",
    description: "",
    icon_path: "",
    display_order: 0,
    is_enabled: true,
    is_sandbox: true,
    supported_currencies: "USD",
    public_instructions: "",
    wallet_address: "",
    status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await phpApi.adminPaymentMethods();
        if (active) setMethods(r.methods as unknown as Method[]);
      } catch { /* silent */ } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const resetForm = () => {
    setShowForm(false); setEditing(null);
    setForm({ method_key: "", display_name: "", description: "", icon_path: "", display_order: 0, is_enabled: true, is_sandbox: true, supported_currencies: "USD", public_instructions: "", wallet_address: "", status: "active" });
    setError("");
  };

  const startEdit = (m: Method) => {
    setEditing(m); setShowForm(true);
    setForm({
      method_key: m.method_key,
      display_name: m.display_name,
      description: m.description ?? "",
      icon_path: m.icon_path ?? "",
      display_order: m.display_order,
      is_enabled: m.is_enabled,
      is_sandbox: m.is_sandbox,
      supported_currencies: m.supported_currencies ?? "",
      public_instructions: m.public_instructions ?? "",
      wallet_address: m.wallet_address ?? "",
      status: m.status as "active" | "archived",
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      if (editing) {
        await phpApi.adminUpdatePaymentMethod(editing.id, form);
        setSuccess("Payment method updated.");
      } else {
        await phpApi.adminCreatePaymentMethod(form);
        setSuccess("Payment method created.");
      }
      resetForm();
      const r = await phpApi.adminPaymentMethods();
      setMethods(r.methods as unknown as Method[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const archive = async (id: number) => {
    if (!confirm("Archive this payment method?")) return;
    try {
      await phpApi.adminArchivePaymentMethod(id);
      setSuccess("Payment method archived.");
      const r = await phpApi.adminPaymentMethods();
      setMethods(r.methods as unknown as Method[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to archive.");
    }
  };

  const restore = async (id: number) => {
    try {
      await phpApi.adminRestorePaymentMethod(id);
      setSuccess("Payment method restored.");
      const r = await phpApi.adminPaymentMethods();
      setMethods(r.methods as unknown as Method[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to restore.");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading payment methods...</p>;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Settings</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Payment Methods</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage payment method display configuration. Sandbox environment — no real payments are processed.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90">
          <Plus size={16} /> Add Method
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-warning">
        <CreditCard size={14} className="shrink-0" />
        <p>All payment methods are sandbox only. No real transactions are processed. No payment credentials are stored.</p>
      </div>

      {showForm && (
        <form onSubmit={save} className="ui-card flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">{editing ? "Edit Payment Method" : "New Payment Method"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Method Key
              <input value={form.method_key} onChange={(e) => setForm({ ...form, method_key: e.target.value })} className={`${inputClass} mt-1.5`} disabled={!!editing} placeholder="demo_card" required />
            </label>
            <label className={labelClass}>
              Display Name
              <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className={`${inputClass} mt-1.5`} placeholder="Demo Card" required />
            </label>
          </div>
          <label className={labelClass}>
            Description
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} mt-1.5`} placeholder="Brief description" />
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className={labelClass}>
              Display Order
              <input type="number" min="0" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} className={`${inputClass} mt-1.5`} />
            </label>
            <label className={labelClass}>
              Supported Currencies
              <input value={form.supported_currencies} onChange={(e) => setForm({ ...form, supported_currencies: e.target.value })} className={`${inputClass} mt-1.5`} placeholder="USD,EUR" />
            </label>
            <label className={labelClass}>
              Status
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "archived" })} className={`${inputClass} mt-1.5`}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-3 rounded-xl border border-line p-4">
              <input type="checkbox" checked={form.is_enabled} onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })} className="size-5 accent-primary" />
              <div>
                <p className="text-sm font-bold">Enabled</p>
                <p className="text-xs text-muted-foreground">Visible to users</p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-line p-4">
              <input type="checkbox" checked={form.is_sandbox} onChange={(e) => setForm({ ...form, is_sandbox: e.target.checked })} className="size-5 accent-primary" />
              <div>
                <p className="text-sm font-bold">Sandbox/Demo</p>
                <p className="text-xs text-muted-foreground">No real transactions</p>
              </div>
            </label>
          </div>
          <label className={labelClass}>
            Public Instructions
            <textarea value={form.public_instructions} onChange={(e) => setForm({ ...form, public_instructions: e.target.value })} className="min-h-20 w-full rounded-xl border border-line bg-surface-2/60 p-3.5 text-sm outline-none focus:border-primary" placeholder="Instructions visible to users..." />
          </label>
          <div className="rounded-xl border border-warning/20 bg-warning/5 p-4">
            <div className="flex items-center gap-2">
              <Wallet size={14} className="text-warning" />
              <p className="text-xs font-bold text-warning">Crypto Wallet Address / Demo Wallet Identifier</p>
            </div>
            <input value={form.wallet_address} onChange={(e) => setForm({ ...form, wallet_address: e.target.value })} className={`${inputClass} mt-2`} placeholder="Enter wallet identifier (e.g. bc1q... or 0x...)" maxLength={255} />
            <p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">
              This is a simulated demo identifier. No real cryptocurrency will be processed. This value will appear on the user deposit page when this payment method is selected.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-muted-foreground">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      )}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {methods.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No payment methods configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="pb-3">Method</th>
                  <th className="pb-3">Key</th>
                  <th className="pb-3">Order</th>
                  <th className="pb-3">Currencies</th>
                  <th className="pb-3">Wallet</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Sandbox</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {methods.map((m) => {
                  const Icon = methodIcons[m.method_key] ?? CreditCard;
                  return (
                    <tr key={m.id} className="border-b border-line/50 last:border-0 align-top">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Icon size={16} className="text-primary" />
                          <span className="font-bold">{m.display_name}</span>
                        </div>
                        {m.description ? <p className="mt-1 text-xs text-muted-foreground">{m.description}</p> : null}
                      </td>
                      <td className="py-3 text-muted-foreground">{m.method_key}</td>
                      <td className="py-3">{m.display_order}</td>
                      <td className="py-3 text-muted-foreground">{m.supported_currencies ?? "—"}</td>
                      <td className="py-3">
                        {m.wallet_address ? (
                          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                            {m.wallet_address.length > 20 ? `${m.wallet_address.slice(0, 20)}...` : m.wallet_address}
                          </code>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${m.status === "active" && m.is_enabled ? "bg-success/10 text-success" : "bg-muted-foreground/10 text-muted-foreground"}`}>
                          {m.status === "active" ? (m.is_enabled ? "Active" : "Disabled") : "Archived"}
                        </span>
                      </td>
                      <td className="py-3">
                        {m.is_sandbox ? <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">Sandbox</span> : <span className="text-xs text-muted-foreground">No</span>}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => startEdit(m)} className="grid size-8 place-items-center rounded-lg border border-line text-muted-foreground hover:border-primary/40 hover:text-primary" title="Edit">
                            <Edit3 size={14} />
                          </button>
                          {m.status === "active" ? (
                            <button onClick={() => archive(m.id)} className="grid size-8 place-items-center rounded-lg border border-warning/30 text-warning hover:border-warning" title="Archive">
                              <Archive size={14} />
                            </button>
                          ) : (
                            <button onClick={() => restore(m.id)} className="grid size-8 place-items-center rounded-lg border border-success/30 text-success hover:border-success" title="Restore">
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
