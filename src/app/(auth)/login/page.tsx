"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { AuthLayout } from "@/frontend/components/auth/auth-layout";
import { AuthInput } from "@/frontend/components/auth/auth-input";
import { OAuthButtons } from "@/frontend/components/auth/oauth-buttons";
import { AuthNotice } from "@/frontend/components/auth/auth-notice";
import { signIn } from "@/backend/actions/auth";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-display tracking-tight text-fg-primary">
            Welcome back
          </h1>
          <p className="text-sm text-fg-tertiary">
            Sign in to your account to continue
          </p>
        </div>

        {/* Surfaces ?error= / ?notice= handed back by the auth routes */}
        <Suspense fallback={null}>
          <AuthNotice />
        </Suspense>

        {/* Form */}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthInput
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-fg-secondary"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-fg-quaternary hover:text-accent-text transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 pr-11 rounded-xl bg-white/2 border border-border-standard text-fg-primary placeholder:text-fg-quaternary focus:outline-none focus:border-accent transition-colors text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-quaternary hover:text-fg-tertiary transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-bright text-bg-canvas font-medium text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-bg-canvas/30 border-t-bg-canvas rounded-full animate-spin" />
            ) : (
              <>
                Sign in
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-subtle" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-bg-canvas text-xs text-fg-quaternary">
              or continue with
            </span>
          </div>
        </div>

        {/* OAuth */}
        <OAuthButtons />

        {/* Footer link */}
        <p className="text-center text-sm text-fg-quaternary">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-fg-secondary hover:text-accent-text transition-colors font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}



