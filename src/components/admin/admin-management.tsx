"use client";

import { useState, useEffect } from "react";
import { Shield, UserPlus, Users } from "lucide-react";
import { phpApi, ApiError } from "@/lib/php-api";

type AdminAccount = { id: number; full_name: string; username: string; email: string; roles: string[] };
type Role = { id: number; name: string; description: string; permission_count: number };

export function AdminManagement() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  useEffect(() => {
    Promise.all([phpApi.adminAdminAccounts(), phpApi.adminRoles()])
      .then(([adminsRes, rolesRes]) => {
        setAdmins(adminsRes.admins);
        setRoles(rolesRes.roles);
      })
      .catch(() => setError("Failed to load administration data."))
      .finally(() => setLoading(false));
  }, []);

  const assign = async () => {
    setError(""); setSuccess("");
    if (!selectedUser || !selectedRole) { setError("Select a user and role."); return; }
    try {
      await phpApi.adminAssignRole({ user_id: Number(selectedUser), role_id: Number(selectedRole) });
      setSuccess("Role assigned.");
      const r = await phpApi.adminAdminAccounts();
      setAdmins(r.admins);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to assign role.");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Administration</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Admin Accounts & Roles</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage administrator accounts, roles, and permissions.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-base font-extrabold"><Users size={17} className="text-primary" /> Assign Role</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Admin User
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none focus:border-primary">
              <option value="">Select user...</option>
              {admins.map((a) => <option key={a.id} value={a.id}>{a.username} ({a.full_name})</option>)}
            </select>
          </label>
          <label className="flex-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Role
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none focus:border-primary">
              <option value="">Select role...</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <button onClick={assign} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white hover:bg-primary/90">
            <UserPlus size={16} /> Assign
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-base font-extrabold">Admin Accounts</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr><th className="pb-3">User</th><th className="pb-3">Email</th><th className="pb-3">Roles</th></tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id} className="border-b border-line/50 last:border-0">
                    <td className="py-3">
                      <p className="font-bold">{a.full_name}</p>
                      <p className="text-xs text-muted-foreground">@{a.username}</p>
                    </td>
                    <td className="py-3 text-muted-foreground">{a.email}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {a.roles.map((r) => (
                          <span key={r} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{r}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-extrabold"><Shield size={17} className="text-primary" /> Roles & Permissions</h2>
          <div className="mt-4 flex flex-col gap-3">
            {roles.map((role) => (
              <div key={role.id} className="rounded-xl border border-line p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold">{role.name}</p>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{role.permission_count} permissions</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{role.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
