"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { ApiError, phpApi } from "@/lib/php-api";
import { useSession } from "@/components/providers/session-provider";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type AuthMode = "login" | "register" | "forgot";

const fieldClass =
  "h-11 w-full rounded-xl border border-line bg-surface-2/60 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

const trust = [
  { icon: ShieldCheck, label: "Server-side authorization" },
  { icon: BadgeCheck, label: "Verified account records" },
  { icon: LockKeyhole, label: "Secure password sessions" },
];

function Field({
  id,
  label,
  icon: Icon,
  ...rest
}: {
  id: string;
  label: string;
  icon: LucideIcon;
} & Omit<React.ComponentProps<"input">, "id" | "className">) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground"
      >
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input id={id} className={fieldClass} {...rest} />
      </div>
    </div>
  );
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const { login, register } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});
    setStatus("");

    const formData = new FormData(event.currentTarget);
    try {
      if (mode === "forgot") {
        const result = await phpApi.forgotPassword(String(formData.get("email") ?? ""));
        setStatus(result.message);
        return;
      }

      if (mode === "register") {
        await register({
          full_name: String(formData.get("full_name") ?? ""),
          username: String(formData.get("username") ?? ""),
          email: String(formData.get("email") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          password: String(formData.get("password") ?? ""),
          password_confirmation: String(formData.get("password_confirmation") ?? ""),
        });
      } else {
        await login(
          String(formData.get("email") ?? ""),
          String(formData.get("password") ?? ""),
        );
      }
      router.push("/dashboard");
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFieldErrors(caught.fields);
      } else {
        setError("We could not complete that request. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const copy: Record<AuthMode, { title: string; subtitle: string }> = {
    login: {
      title: "Sign in to your account",
      subtitle: "Welcome back. Manage your profile, support, and account activity.",
    },
    register: {
      title: "Create your account",
      subtitle: "Create a secure account profile for your Neximatrix.com account center.",
    },
    forgot: {
      title: "Reset your password",
      subtitle:
        "Enter the email linked to your account. If it exists, we’ll send reset instructions.",
    },
  };

  const body: Record<AuthMode, ReactNode> = {
    login: (
      <>
        <Field
          id="email"
          label="Email or username"
          icon={Mail}
          name="email"
          type="text"
          placeholder="you@example.com or username"
          autoComplete="username"
          required
        />
        <Field
          id="password"
          label="Password"
          icon={LockKeyhole}
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
          minLength={8}
        />
        <PasswordToggle
          checked={showPassword}
          onChange={setShowPassword}
        />
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link
            href="/forgot-password"
            className="text-sm font-bold text-primary hover:underline"
          >
            Forgot Password?
          </Link>
        </div>
      </>
    ),
    register: (
      <>
        <Field
          id="name"
          label="Full Name"
          icon={User}
          name="full_name"
          placeholder="Enter your full name"
          autoComplete="name"
          required
        />
        <Field
          id="username"
          label="Username"
          icon={User}
          name="username"
          placeholder="Choose a username"
          autoComplete="username"
          required
        />
        <Field
          id="email"
          label="Email Address"
          icon={Mail}
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <Field
          id="phone"
          label="Phone Number"
          icon={UserPlus}
          name="phone"
          type="tel"
          placeholder="Enter your phone number"
          autoComplete="tel"
          required
        />
        <Field
          id="password"
          label="Password"
          icon={LockKeyhole}
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder="8+ characters, letter and number"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <Field
          id="password_confirmation"
          label="Confirm Password"
          icon={LockKeyhole}
          name="password_confirmation"
          type={showPassword ? "text" : "password"}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <PasswordToggle checked={showPassword} onChange={setShowPassword} />
      </>
    ),
    forgot: (
      <>
        {status ? (
          <p className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
            {status}
          </p>
        ) : null}
        <Field
          id="email"
          label="Email Address"
          icon={Mail}
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </>
    ),
  };

  const submitLabel: Record<AuthMode, [string, string]> = {
    login: ["Login", "Logging in..."],
    register: ["Create Account", "Creating account..."],
    forgot: ["Email Reset Link", "Sending..."],
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center overflow-hidden bg-shell px-5 py-8">
      {/* Ambient lighting */}
      <div aria-hidden className="hero-glow absolute inset-0 opacity-70" />
      <div aria-hidden className="grid-overlay absolute inset-0 opacity-50" />
      <div
        aria-hidden
        className="bloom -left-40 top-4 size-[30rem] opacity-[0.13]"
        style={{ background: "var(--primary)" }}
      />
      <div
        aria-hidden
        className="bloom -right-48 bottom-0 size-[32rem] opacity-[0.10]"
        style={{ background: "var(--primary)" }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex w-full max-w-6xl items-center justify-between">
        <Logo showWordmark />
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-card px-3.5 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back to site</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Card */}
      <main className="relative z-10 flex w-full flex-1 items-center justify-center py-10">
        <div className="w-full max-w-[480px]">
          <div className="mb-7 flex flex-col items-center text-center">
            <h1 className="text-[clamp(1.6rem,1.2rem+1.6vw,2.15rem)] font-extrabold leading-tight tracking-[-0.035em]">
              {copy[mode].title}
            </h1>
            <p className="mt-2.5 max-w-sm text-sm leading-6 text-muted-foreground">
              {copy[mode].subtitle}
            </p>
          </div>

          <form
            onSubmit={submit}
            className="ui-card flex flex-col gap-5 rounded-2xl p-6 shadow-[0_30px_80px_rgba(0,0,0,0.4)] sm:p-8"
          >
            <div className="flex flex-col gap-5">{body[mode]}</div>

            {error ? (
              <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
                {error}
              </p>
            ) : null}
            {Object.entries(fieldErrors).length > 0 ? (
              <ul role="alert" className="flex flex-col gap-1 text-xs font-semibold text-danger">
                {Object.entries(fieldErrors).map(([field, message]) => (
                  <li key={field}>{message}</li>
                ))}
              </ul>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-white shadow-[0_12px_32px_rgba(248,129,45,0.3)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-strong disabled:pointer-events-none disabled:opacity-60"
            >
              {loading ? submitLabel[mode][1] : submitLabel[mode][0]}
            </button>

            {mode === "forgot" ? (
              <Link
                href="/login"
                className="text-center text-sm font-bold text-muted-foreground transition-colors hover:text-primary"
              >
                Back to sign in
              </Link>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                <Link
                  href={mode === "login" ? "/register" : "/login"}
                  className="font-bold text-primary hover:underline"
                >
                  {mode === "login" ? "Sign Up" : "Sign in"}
                </Link>
              </p>
            )}
          </form>

          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-xs text-muted-foreground">
            {trust.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label} className="flex items-center gap-1.5">
                  <Icon size={13} className="text-primary" />
                  <span>{item.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </div>
  );
}

function PasswordToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="inline-flex w-fit items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary"
      aria-pressed={checked}
    >
      {checked ? (
        <EyeOff className="size-3.5" />
      ) : (
        <Eye className="size-3.5" />
      )}
      {checked ? "Hide password" : "Show password"}
    </button>
  );
}
