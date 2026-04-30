"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, MailCheck } from "lucide-react";
import { AuthLayout } from "@/frontend/components/auth/auth-layout";
import { AuthInput } from "@/frontend/components/auth/auth-input";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // TODO: wire up auth
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="space-y-8 animate-fade-in text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <MailCheck className="w-7 h-7 text-accent-text" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-display tracking-tight text-fg-primary">
              Check your email
            </h1>
            <p className="text-sm text-fg-tertiary leading-relaxed">
              We sent a password reset link to{" "}
              <span className="text-fg-secondary font-medium">{email}</span>.
              It expires in 15 minutes.
            </p>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setSent(false)}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/2 border border-border-standard hover:bg-white/4 hover:border-border-strong text-fg-secondary font-medium text-sm transition-all"
            >
              Resend email
            </button>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-fg-quaternary hover:text-fg-tertiary transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-display tracking-tight text-fg-primary">
            Reset your password
          </h1>
          <p className="text-sm text-fg-tertiary">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthInput
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-bright text-bg-canvas font-medium text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-bg-canvas/30 border-t-bg-canvas rounded-full animate-spin" />
            ) : (
              <>
                Send reset link
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm text-fg-quaternary hover:text-fg-tertiary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
