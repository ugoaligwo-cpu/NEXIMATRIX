"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, UserPlus, ShieldCheck, ShieldOff, Eye, StickyNote } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

type UserItem = {
  id: number;
  full_name: string;
  username: string;
  email: string;
  phone: string | null;
  status: string;
  roles: string[];
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
};

export function AdminUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const limit = 15;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await phpApi.adminUsers({ search, status: statusFilter || undefined, page, limit });
      setUsers(result.users.items as unknown as UserItem[]);
      setTotal(result.users.total);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const result = await phpApi.adminUsers({ search, status: statusFilter || undefined, page, limit });
        if (active) {
          setUsers(result.users.items as unknown as UserItem[]);
          setTotal(result.users.total);
        }
      } catch {
        if (active) setError("Failed to load users.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [search, statusFilter, page]);

  const changeStatus = async (userId: number, status: string) => {
    setError(""); setSuccess("");
    try {
      await phpApi.setAdminUserStatus(userId, status as "pending" | "active" | "suspended" | "disabled" | "closed");
      setSuccess(`Account ${status === "active" ? "reactivated" : "updated"}.`);
      loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status.");
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    setError(""); setSuccess("");
    try {
      await phpApi.updateAdminUser(editingUser.id, { full_name: editName, phone: editPhone });
      setSuccess("Profile updated.");
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Users</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">User Management</h1>
        <p className="mt-2 text-sm text-muted-foreground">Search, view, edit, and manage user accounts.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className={`${inputClass} pl-9`} placeholder="Search name, username, or email" />
        </label>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={inputClass}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="disabled">Disabled</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No users found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="pb-3">User</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Roles</th>
                    <th className="pb-3">Joined</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-line/50 last:border-0 align-top">
                      <td className="py-3">
                        <Link href={`/admin/users/${u.id}`} className="font-bold text-primary hover:underline">{u.full_name}</Link>
                        <p className="text-xs text-muted-foreground">@{u.username} | {u.email}</p>
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                          u.status === "active" ? "bg-success/10 text-success" :
                          u.status === "pending" ? "bg-warning/10 text-warning" :
                          "bg-danger/10 text-danger"
                        }`}>{u.status}</span>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <span key={r} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{r}</span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="py-3">
                        <div className="flex gap-1.5">
                          <Link href={`/admin/users/${u.id}`} className="grid size-8 place-items-center rounded-lg border border-line text-muted-foreground hover:border-primary/40 hover:text-primary" title="View">
                            <Eye size={14} />
                          </Link>
                          <button
                            onClick={() => { setEditingUser(u); setEditName(u.full_name); setEditPhone(u.phone ?? ""); }}
                            className="grid size-8 place-items-center rounded-lg border border-line text-muted-foreground hover:border-primary/40 hover:text-primary"
                            title="Edit"
                          >
                            <UserPlus size={14} />
                          </button>
                          {u.status === "active" ? (
                            <button
                              onClick={() => changeStatus(u.id, "suspended")}
                              className="grid size-8 place-items-center rounded-lg border border-warning/30 text-warning hover:border-warning"
                              title="Suspend"
                            >
                              <ShieldOff size={14} />
                            </button>
                          ) : (
                            <button
                              onClick={() => changeStatus(u.id, "active")}
                              className="grid size-8 place-items-center rounded-lg border border-success/30 text-success hover:border-success"
                              title="Reactivate"
                            >
                              <ShieldCheck size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages} ({total} users)</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-40">Previous</button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </section>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-extrabold">Edit User</h2>
            <p className="mt-1 text-sm text-muted-foreground">@{editingUser.username} | {editingUser.email}</p>
            <form onSubmit={saveProfile} className="mt-5 flex flex-col gap-4">
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Full Name
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className={`${inputClass} mt-1.5`} required />
              </label>
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Phone
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className={`${inputClass} mt-1.5`} />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingUser(null)} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-muted-foreground">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
