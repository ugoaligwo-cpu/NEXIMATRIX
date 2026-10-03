"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit3, Trash2, Power } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";
const labelClass = "text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground";

type Faq = { id: number; question: string; answer: string; sort_order: number; is_active: boolean };

export function FaqManager() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadFaqs = useCallback(async () => {
    try {
      const r = await phpApi.adminFaqs();
      setFaqs(r.faqs as unknown as Faq[]);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await phpApi.adminFaqs();
        if (active) setFaqs(r.faqs as unknown as Faq[]);
      } catch { /* silent */ } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const resetForm = () => { setShowForm(false); setEditing(null); setQuestion(""); setAnswer(""); setError(""); };

  const startEdit = (f: Faq) => { setEditing(f); setShowForm(true); setQuestion(f.question); setAnswer(f.answer); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      if (editing) {
        await phpApi.adminUpdateFaq(editing.id, { question, answer });
        setSuccess("FAQ updated.");
      } else {
        await phpApi.adminCreateFaq({ question, answer, sort_order: faqs.length + 1 });
        setSuccess("FAQ created.");
      }
      resetForm();
      loadFaqs();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this FAQ?")) return;
    try {
      await phpApi.adminDeleteFaq(id);
      setSuccess("FAQ deleted.");
      loadFaqs();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete.");
    }
  };

  const toggleActive = async (f: Faq) => {
    try {
      await phpApi.adminUpdateFaq(f.id, { is_active: !f.is_active });
      loadFaqs();
    } catch { /* silent */ }
  };

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Content</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">FAQ Management</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage frequently asked questions.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90">
          <Plus size={16} /> Add FAQ
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      {showForm && (
        <form onSubmit={save} className="ui-card flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">{editing ? "Edit FAQ" : "New FAQ"}</h2>
          <label className={labelClass}>
            Question
            <input value={question} onChange={(e) => setQuestion(e.target.value)} className={`${inputClass} mt-1.5`} required />
          </label>
          <label className={labelClass}>
            Answer
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} className="min-h-24 w-full rounded-xl border border-line bg-surface-2/60 p-3.5 text-sm outline-none focus:border-primary" required />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetForm} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-muted-foreground">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      )}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading FAQs...</p>
        ) : faqs.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No FAQs yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {faqs.map((faq) => (
              <div key={faq.id} className="rounded-xl border border-line p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{faq.question}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button onClick={() => toggleActive(faq)} className={`grid size-8 place-items-center rounded-lg border ${faq.is_active ? "border-success/30 text-success" : "border-muted-foreground/30 text-muted-foreground"}`} title={faq.is_active ? "Deactivate" : "Activate"}>
                      <Power size={14} />
                    </button>
                    <button onClick={() => startEdit(faq)} className="grid size-8 place-items-center rounded-lg border border-line text-muted-foreground hover:border-primary/40 hover:text-primary" title="Edit">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => remove(faq.id)} className="grid size-8 place-items-center rounded-lg border border-danger/30 text-danger hover:border-danger" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
