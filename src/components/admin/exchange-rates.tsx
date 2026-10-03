"use client";

import { useState, useEffect } from "react";
import { DollarSign, Power } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

type ExchangeRate = {
  id: number;
  currency_code: string;
  currency_name: string;
  rate: number;
  is_active: number;
  display_precision: number;
  is_default: number;
};

export function ExchangeRates() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState<ExchangeRate | null>(null);
  const [editRate, setEditRate] = useState("");
  const [editPrecision, setEditPrecision] = useState(2);

  const loadRates = async () => {
    setLoading(true);
    try {
      const result = await phpApi.adminExchangeRates();
      setRates(result.rates as unknown as ExchangeRate[]);
    } catch {
      setError("Failed to load exchange rates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  const startEdit = (rate: ExchangeRate) => {
    setEditing(rate);
    setEditRate(String(rate.rate));
    setEditPrecision(rate.display_precision);
    setError(""); setSuccess("");
  };

  const saveEdit = async () => {
    if (!editing) return;
    setError(""); setSuccess("");
    try {
      await phpApi.adminUpdateExchangeRates([{
        currency_code: editing.currency_code,
        rate: parseFloat(editRate),
        display_precision: editPrecision,
      }]);
      setSuccess("Exchange rate updated.");
      setEditing(null);
      loadRates();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update rate.");
    }
  };

  const toggleActive = async (rate: ExchangeRate) => {
    setError(""); setSuccess("");
    try {
      await phpApi.adminUpdateExchangeRates([{
        currency_code: rate.currency_code,
        rate: rate.rate,
        display_precision: rate.display_precision,
        is_active: rate.is_active ? 0 : 1,
      }]);
      setSuccess(`${rate.currency_code} ${rate.is_active ? "disabled" : "enabled"}.`);
      loadRates();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update rate.");
    }
  };

  if (loading) return <p className="py-16 text-center text-sm text-muted-foreground">Loading exchange rates...</p>;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Settings</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Exchange Rates</h1>
        <p className="mt-2 text-sm text-muted-foreground">Configure demo currency display rates. These are illustrative values only and do not execute actual conversions.</p>
      </header>

      <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-xs text-warning">
        <DollarSign size={14} className="shrink-0" />
        <p>All exchange rates are demo configuration. No actual currency conversion or transfers are processed.</p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      {editing && (
        <div className="ui-card flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Edit: {editing.currency_code} — {editing.currency_name}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Exchange Rate
              <input type="number" step="0.00000001" value={editRate} onChange={(e) => setEditRate(e.target.value)} className={`${inputClass} mt-1.5`} />
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Display Precision
              <input type="number" min="0" max="8" value={editPrecision} onChange={(e) => setEditPrecision(Number(e.target.value))} className={`${inputClass} mt-1.5`} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-muted-foreground">Cancel</button>
            <button onClick={saveEdit} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">Save</button>
          </div>
        </div>
      )}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <tr>
                <th className="pb-3">Currency</th>
                <th className="pb-3">Code</th>
                <th className="pb-3">Rate</th>
                <th className="pb-3">Precision</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr key={rate.id} className="border-b border-line/50 last:border-0">
                  <td className="py-3 font-bold">{rate.currency_name}</td>
                  <td className="py-3 text-muted-foreground">{rate.currency_code}</td>
                  <td className="py-3 font-bold text-primary">{Number(rate.rate).toFixed(rate.display_precision)}</td>
                  <td className="py-3 text-muted-foreground">{rate.display_precision}</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${rate.is_active ? "bg-success/10 text-success" : "bg-muted-foreground/10 text-muted-foreground"}`}>
                      {rate.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => startEdit(rate)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-primary hover:border-primary/40">
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(rate)}
                        className={`grid size-8 place-items-center rounded-lg border ${rate.is_active ? "border-warning/30 text-warning" : "border-success/30 text-success"}`}
                        title={rate.is_active ? "Disable" : "Enable"}
                      >
                        <Power size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
