"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { User, Activity, LifeBuoy, Bell, StickyNote } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

type UserDetailData = {
  user: {
    id: number;
    fullName: string;
    username: string;
    email: string;
    phone: string;
    status: string;
    roles: string[];
    emailVerified: boolean;
    lastLoginAt: string | null;
    createdAt: string | null;
  };
  openSupportTickets: number;
  unreadNotifications: number;
  recentActivity: Array<{ id?: number; action: string; entity_type?: string | null; entity_id?: number | null; created_at: string }>;
  notes: Array<{ id: number; note: string; created_at: string; admin_name: string }>;
};

export function UserDetail() {
  const params = useParams();
  const id = Number(params.id);

  const [detail, setDetail] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!id || isNaN(id)) return;
      try {
        const result = await phpApi.adminUserDetail(id);
        if (active) setDetail(result.detail);
      } catch {
        if (active) setError("Failed to load user detail.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [id]);

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    setError("");
    try {
      await phpApi.adminAddUserNote({ user_id: id, note: note.trim() });
      setNote("");
      const result = await phpApi.adminUserDetail(id);
      setDetail(result.detail);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add note.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading user...</p>;
  if (error && !detail) return <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>;
  if (!detail) return <p className="text-sm text-muted-foreground">User not found.</p>;

  const { user } = detail;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Users</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">{user.fullName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">@{user.username} | {user.email}</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Status</p>
          <p className={`mt-1 text-lg font-extrabold capitalize ${user.status === "active" ? "text-success" : "text-warning"}`}>{user.status}</p>
        </div>
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Open Tickets</p>
          <p className="mt-1 text-lg font-extrabold text-primary">{detail.openSupportTickets}</p>
        </div>
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Unread</p>
          <p className="mt-1 text-lg font-extrabold text-warning">{detail.unreadNotifications}</p>
        </div>
        <div className="ui-card rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Roles</p>
          <div className="mt-1 flex flex-wrap justify-center gap-1">
            {user.roles.map((r) => (
              <span key={r} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{r}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><User size={17} className="text-primary" /> Profile</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Full Name</span><span className="font-bold">{user.fullName}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Username</span><span className="font-bold">@{user.username}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Email</span><span className="font-bold">{user.email}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Phone</span><span className="font-bold">{user.phone || "—"}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Email Verified</span><span className="font-bold">{user.emailVerified ? "Yes" : "No"}</span></div>
            <div className="flex justify-between border-b border-line/50 pb-2"><span className="text-muted-foreground">Last Login</span><span className="font-bold">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Registered</span><span className="font-bold">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</span></div>
          </div>
        </section>

        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><Activity size={17} className="text-primary" /> Recent Activity</h2>
          <div className="mt-4 flex flex-col gap-2">
            {detail.recentActivity.length > 0 ? (
              detail.recentActivity.slice(0, 6).map((item, i) => (
                <div key={`${item.action}-${item.created_at}-${i}`} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Activity size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{item.action.replace(/^user\./, "").replace(/^admin\./, "").replaceAll("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-extrabold"><StickyNote size={17} className="text-primary" /> Admin Notes</h2>
        <p className="mt-1 text-xs text-muted-foreground">Notes are only visible to authorized administrators.</p>
        <form onSubmit={addNote} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} flex-1`} placeholder="Add a note about this user..." />
          <button type="submit" disabled={saving} className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-white hover:bg-primary/90 disabled:opacity-60">
            {saving ? "Saving..." : "Add Note"}
          </button>
        </form>
        <div className="mt-4 flex flex-col gap-2">
          {detail.notes.length > 0 ? (
            detail.notes.map((n) => (
              <div key={n.id} className="rounded-xl border border-line bg-surface-2/30 p-4">
                <p className="text-sm">{n.note}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{n.admin_name} | {new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted-foreground">No notes yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
