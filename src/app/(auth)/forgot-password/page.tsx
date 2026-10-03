import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Request an Neximatrix.com password reset link.",
};

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" />;
}
