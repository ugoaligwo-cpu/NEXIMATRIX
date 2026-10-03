"use client";

import { CheckCircle2, KeyRound } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ApiError, phpApi } from "@/lib/php-api";

const inputClass = "h-11 w-full rounded-xl border border-line bg-surface-2/60 px-3.5 text-sm outline-none focus:border-primary";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await phpApi.resetPassword({
        token,
        password,
        password_confirmation: confirmation,
      });
      setSuccess(result.message);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">This reset link is missing its token. Request a new reset link.</div>;
  }

  return <form onSubmit={submit} className="flex flex-col gap-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><KeyRound size={19} /></span><p className="text-sm leading-6 text-muted-foreground">Choose a new password for your account.</p></div><label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className={`mt-2 ${inputClass}`} minLength={8} maxLength={72} autoComplete="new-password" required /></label><label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Confirm password<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className={`mt-2 ${inputClass}`} minLength={8} maxLength={72} autoComplete="new-password" required /></label>{error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}{success ? <div role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success"><CheckCircle2 size={15} className="mr-2 inline" />{success} <Link href="/login" className="ml-2 underline">Sign in</Link></div> : null}<button type="submit" disabled={loading || Boolean(success)} className="h-11 rounded-xl bg-primary text-sm font-bold text-white transition hover:bg-primary-strong disabled:opacity-60">{loading ? "Updating…" : "Update password"}</button></form>;
}
