"use client";

import { useState, useEffect } from "react";
import { User, Shield, Clock, KeyRound } from "lucide-react";
import { useSession } from "@/components/providers/session-provider";
import { phpApi, ApiError } from "@/lib/php-api";

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface-2/60 px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

type LoginAttempt = {
  id: number;
  identifier: string;
  success: boolean;
  ip_address: string | null;
  created_at: string;
};

export function AdminProfile() {
  const { user, refresh } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [loginHistory, setLoginHistory] = useState<LoginAttempt[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    phpApi.adminLoginHistory({ limit: 10 })
      .then((r) => setLoginHistory(r.attempts as unknown as LoginAttempt[]))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(""); setPasswordSuccess(""); setChangingPassword(true);
    try {
      await phpApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      });
      setCurrentPassword(""); setNewPassword(""); setNewPasswordConfirmation("");
      setPasswordSuccess("Password updated successfully.");
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Password change failed.");
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) return <p className="py-16 text-center text-sm text-muted-foreground">Loading profile...</p>;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Administration</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Admin Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage your administrator account settings and security.</p>
      </header>

      <section className="ui-card flex flex-col items-center gap-5 rounded-2xl p-8 sm:flex-row">
        <div className="grid size-24 shrink-0 place-items-center rounded-full bg-primary text-3xl font-extrabold text-white">
          {user.fullName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-xl font-extrabold tracking-tight">{user.fullName}</p>
          <p className="mt-1 text-sm text-muted-foreground">@{user.username} | {user.email}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            {user.roles.map((role) => (
              <span key={role} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{role}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="ui-card rounded-2xl p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <KeyRound size={20} className="mt-0.5 text-primary" />
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">Change Password</h2>
            <p className="mt-1 text-sm text-muted-foreground">Update your administrator password. Other sessions will be signed out.</p>
          </div>
        </div>
        <form onSubmit={changePassword} className="mt-6 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Current Password
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={`${inputClass} mt-2`} autoComplete="current-password" required />
          </label>
          <span className="hidden sm:block" />
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            New Password
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`${inputClass} mt-2`} minLength={8} maxLength={72} autoComplete="new-password" required />
          </label>
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Confirm New Password
            <input type="password" value={newPasswordConfirmation} onChange={(e) => setNewPasswordConfirmation(e.target.value)} className={`${inputClass} mt-2`} minLength={8} maxLength={72} autoComplete="new-password" required />
          </label>
          <div className="sm:col-span-2">
            {passwordError && <p role="alert" className="mb-3 text-sm font-semibold text-danger">{passwordError}</p>}
            {passwordSuccess && <p role="status" className="mb-3 flex items-center gap-2 text-sm font-bold text-success"><Shield size={16} />{passwordSuccess}</p>}
            <button type="submit" disabled={changingPassword} className="inline-flex h-10 items-center rounded-xl border border-primary px-4 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:opacity-60">
              {changingPassword ? "Updating..." : "Change Password"}
            </button>
          </div>
        </form>
      </section>

      <section className="ui-card rounded-2xl p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <Clock size={18} className="text-primary" /> Recent Login History
        </h2>
        {loadingHistory ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
        ) : loginHistory.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No login history.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="pb-3">Identifier</th>
                  <th className="pb-3">IP</th>
                  <th className="pb-3">Result</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((attempt) => (
                  <tr key={attempt.id} className="border-b border-line/50 last:border-0">
                    <td className="py-3 font-bold">{attempt.identifier}</td>
                    <td className="py-3 text-muted-foreground">{attempt.ip_address || "—"}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${attempt.success ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                        {attempt.success ? "Success" : "Failed"}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">{new Date(attempt.created_at).toLocaleString()}</td>
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
