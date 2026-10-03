import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <main className="grid min-h-screen place-items-center bg-shell px-5 py-10"><div className="w-full max-w-md"><div className="mb-7 text-center"><h1 className="text-2xl font-extrabold tracking-[-0.03em]">Choose a new password</h1><p className="mt-2 text-sm text-muted-foreground">Your reset link is valid for one hour.</p></div><section className="ui-card rounded-2xl p-6 shadow-2xl sm:p-8"><ResetPasswordForm token={params.token ?? ""} /></section></div></main>;
}
