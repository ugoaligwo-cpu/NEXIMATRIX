"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/php-api";
import { useSession } from "@/components/providers/session-provider";
import { Logo } from "@/components/ui/logo";

export default function AdminLoginPage() {
  const router = useRouter();
  const { adminLogin } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await adminLogin(identifier, password);
      router.replace("/admin");
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.status === 401) {
          setError("Invalid administrator credentials. Please check your username and password.");
        } else if (caught.status === 403) {
          setError("This account does not have administrator access.");
        } else if (caught.status === 428) {
          setError("Session expired. Please refresh the page and try again.");
        } else if (caught.status >= 500) {
          setError("Server error. Please try again later.");
        } else {
          setError(caught.message);
        }
      } else {
        setError("Network error. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return <main className="grid min-h-screen place-items-center bg-shell px-5 py-10"><div className="w-full max-w-md"><div className="mb-7 flex justify-center"><Logo showWordmark /></div><section className="ui-card rounded-2xl p-6 shadow-2xl sm:p-8"><div className="text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/12 text-primary"><ShieldCheck size={24} /></span><h1 className="mt-5 text-2xl font-extrabold tracking-[-0.03em]">Administrator sign in</h1><p className="mt-2 text-sm text-muted-foreground">Use an account with an administrator role.</p></div><form onSubmit={submit} className="mt-7 flex flex-col gap-4"><label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Email or username<input value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-line bg-surface-2/60 px-3.5 text-sm outline-none focus:border-primary" autoComplete="username" required /></label><label className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Password<input value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-line bg-surface-2/60 px-3.5 text-sm outline-none focus:border-primary" type="password" autoComplete="current-password" required /></label>{error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}<button type="submit" disabled={loading} className="h-11 rounded-xl bg-primary text-sm font-bold text-white transition hover:bg-primary-strong disabled:opacity-60">{loading ? "Signing in…" : "Sign in to admin"}</button></form></section><p className="mt-5 text-center text-sm text-muted-foreground"><Link href="/login" className="font-bold text-primary hover:underline">Return to user sign in</Link></p></div></main>;
}
