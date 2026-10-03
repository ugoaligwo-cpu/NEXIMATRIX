"use client";

import { CheckCircle2, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useSession } from "@/components/providers/session-provider";
import { ApiError, phpApi, type SessionUser } from "@/lib/php-api";

const inputClass =
  "mt-2 block h-11 w-full rounded-xl border border-line bg-surface-2/60 px-3.5 text-sm outline-none transition-colors focus:border-primary";
const labelClass =
  "block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground";

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function ProfileDetails({ user, refresh, logout }: { user: SessionUser; refresh: () => Promise<SessionUser | null>; logout: () => Promise<void> }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await phpApi.updateProfile({ full_name: fullName, phone });
      await refresh();
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Profile update failed.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChangingPassword(true);
    setPasswordError("");
    setPasswordMessage("");
    try {
      await phpApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      });
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
      setPasswordMessage("Password updated. Other sessions were signed out.");
    } catch (caught) {
      setPasswordError(caught instanceof ApiError ? caught.message : "Password update failed.");
    } finally {
      setChangingPassword(false);
    }
  };

  const signOut = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="flex w-full flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Account settings</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Profile</h1>
      </header>

      <section className="ui-card flex flex-col items-center gap-5 rounded-2xl p-8 sm:flex-row">
        <div className="grid size-24 shrink-0 place-items-center rounded-full bg-primary text-3xl font-extrabold text-white">{initials(user.fullName)}</div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-xl font-extrabold tracking-tight">{user.fullName}</p>
          <p className="mt-1 flex items-center justify-center gap-2 truncate text-sm text-muted-foreground sm:justify-start"><Mail size={14} /> {user.email}</p>
          <p className="mt-2 text-xs font-semibold text-muted-foreground">@{user.username}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-bold capitalize"><ShieldCheck size={16} className="text-success" />{user.status}</span>
          <button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-strong"><LogOut size={16} /> Logout</button>
        </div>
      </section>

      <section className="ui-card rounded-2xl p-6 sm:p-8">
        <form onSubmit={save} className="max-w-2xl">
          <header><h2 className="text-lg font-extrabold tracking-tight">Profile information</h2><p className="mt-1 text-sm text-muted-foreground">Update the information you are permitted to change.</p></header>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className={labelClass}>Full name<input name="full_name" value={fullName} onChange={(event) => setFullName(event.target.value)} className={inputClass} required minLength={2} maxLength={120} /></label>
            <label className={labelClass}>Email<input value={user.email} className={inputClass} disabled /><span className="mt-1.5 block text-xs font-normal normal-case tracking-normal text-muted-foreground">Contact support to change your verified email.</span></label>
            <label className={labelClass}>Phone<input name="phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} maxLength={30} placeholder="Enter your phone number" /></label>
            <label className={labelClass}>Username<input value={user.username} className={inputClass} disabled /><span className="mt-1.5 block text-xs font-normal normal-case tracking-normal text-muted-foreground">Your username is managed by support.</span></label>
          </div>
          {error ? <p role="alert" className="mt-5 text-sm font-semibold text-danger">{error}</p> : null}
          {saved ? <p role="status" className="mt-5 flex items-center gap-2 text-sm font-bold text-success"><CheckCircle2 size={16} /> Profile saved.</p> : null}
          <button type="submit" disabled={saving} className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 text-sm font-bold text-white transition hover:bg-primary-strong disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>
        </form>
      </section>

      <section className="ui-card rounded-2xl p-6 sm:p-8">
        <div className="flex items-start gap-3"><UserRound size={20} className="mt-0.5 text-primary" /><div><h2 className="text-lg font-extrabold tracking-tight">Account security</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Change your password without exposing financial account data. Other active sessions are signed out after a successful change.</p><p className="mt-3 text-sm font-semibold">Email verification: {user.emailVerified ? "Verified" : "Pending"}</p></div></div>
        <form onSubmit={changePassword} className="mt-6 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelClass}>Current password<input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClass} autoComplete="current-password" required /></label>
          <span className="hidden sm:block" />
          <label className={labelClass}>New password<input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputClass} minLength={8} maxLength={72} autoComplete="new-password" required /></label>
          <label className={labelClass}>Confirm new password<input type="password" value={newPasswordConfirmation} onChange={(event) => setNewPasswordConfirmation(event.target.value)} className={inputClass} minLength={8} maxLength={72} autoComplete="new-password" required /></label>
          <div className="sm:col-span-2">{passwordError ? <p role="alert" className="mb-3 text-sm font-semibold text-danger">{passwordError}</p> : null}{passwordMessage ? <p role="status" className="mb-3 flex items-center gap-2 text-sm font-bold text-success"><CheckCircle2 size={16} />{passwordMessage}</p> : null}<button type="submit" disabled={changingPassword} className="inline-flex h-10 items-center rounded-xl border border-primary px-4 text-sm font-bold text-primary transition hover:bg-primary/10 disabled:opacity-60">{changingPassword ? "Updating…" : "Change password"}</button></div>
        </form>
      </section>
    </div>
  );
}

export function ProfileView() {
  const { user, loading, refresh, logout } = useSession();
  if (loading || !user) return <div className="py-16 text-center text-sm text-muted-foreground">Loading profile…</div>;
  return <ProfileDetails key={user.id} user={user} refresh={refresh} logout={logout} />;
}
