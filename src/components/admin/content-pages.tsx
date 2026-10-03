"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit3, Trash2, ExternalLink, Save, X } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";
const labelClass = "text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground";

type Page = { id: number; slug: string; title: string; body: string; status: string; published_at: string | null; updated_at: string };

export function ContentPages() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Page | null>(null);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPages = useCallback(async () => {
    try {
      const r = await phpApi.adminContentPages();
      setPages(r.pages as unknown as Page[]);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await phpApi.adminContentPages();
        if (active) setPages(r.pages as unknown as Page[]);
      } catch { /* silent */ } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const resetForm = () => {
    setShowForm(false); setEditing(null);
    setSlug(""); setTitle(""); setBody(""); setStatus("draft");
    setError("");
  };

  const startEdit = (p: Page) => {
    setEditing(p); setShowForm(true);
    setSlug(p.slug); setTitle(p.title); setBody(p.body); setStatus(p.status as "draft" | "published");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      if (editing) {
        await phpApi.adminUpdateContentPage(editing.id, { title, body, status });
        setSuccess("Page updated.");
      } else {
        await phpApi.adminCreateContentPage({ slug, title, body, status });
        setSuccess("Page created.");
      }
      resetForm();
      loadPages();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this page?")) return;
    try {
      await phpApi.adminDeleteContentPage(id);
      setSuccess("Page deleted.");
      loadPages();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete.");
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Content</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Content Pages</h1>
          <p className="mt-2 text-sm text-muted-foreground">Create and manage custom content pages.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90">
          <Plus size={16} /> New Page
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      {showForm && (
        <form onSubmit={save} className="ui-card flex flex-col gap-4 rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">{editing ? "Edit Page" : "New Page"}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Slug
              <input value={slug} onChange={(e) => setSlug(e.target.value)} className={`${inputClass} mt-1.5`} disabled={!!editing} placeholder="about-us" required />
            </label>
            <label className={labelClass}>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputClass} mt-1.5`} placeholder="Page title" required />
            </label>
          </div>
          <label className={labelClass}>
            Body (HTML)
            <textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-32 w-full rounded-xl border border-line bg-surface-2/60 p-3.5 text-sm outline-none focus:border-primary" />
          </label>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="radio" checked={status === "draft"} onChange={() => setStatus("draft")} className="accent-primary" /> Draft
            </label>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="radio" checked={status === "published"} onChange={() => setStatus("published")} className="accent-primary" /> Published
            </label>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={resetForm} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-muted-foreground">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </form>
      )}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading pages...</p>
        ) : pages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No pages yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Slug</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Updated</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.id} className="border-b border-line/50 last:border-0">
                    <td className="py-3 font-bold">{p.title}</td>
                    <td className="py-3 text-muted-foreground">/{p.slug}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.status === "published" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{p.status}</span>
                    </td>
                    <td className="py-3 text-muted-foreground">{new Date(p.updated_at).toLocaleDateString()}</td>
                    <td className="py-3">
                      <div className="flex gap-1.5">
                        <a href={`/${p.slug}`} target="_blank" rel="noopener noreferrer" className="grid size-8 place-items-center rounded-lg border border-line text-muted-foreground hover:border-primary/40 hover:text-primary" title="View">
                          <ExternalLink size={14} />
                        </a>
                        <button onClick={() => startEdit(p)} className="grid size-8 place-items-center rounded-lg border border-line text-muted-foreground hover:border-primary/40 hover:text-primary" title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => remove(p.id)} className="grid size-8 place-items-center rounded-lg border border-danger/30 text-danger hover:border-danger" title="Delete">
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
