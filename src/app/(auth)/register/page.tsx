"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { ArrowRight, Eye, EyeOff, Check } from "lucide-react";
import { AuthLayout } from "@/frontend/components/auth/auth-layout";
import { AuthInput } from "@/frontend/components/auth/auth-input";
import { OAuthButtons } from "@/frontend/components/auth/oauth-buttons";
import { AuthNotice } from "@/frontend/components/auth/auth-notice";
import { signUp } from "@/backend/actions/auth";

const passwordRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
];

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const firstName = fd.get("firstName") as string;
    const lastName = fd.get("lastName") as string;
    fd.set("fullName", `${firstName} ${lastName}`.trim());
    const result = await signUp(fd);
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
            Create your account
          </h1>
          <p className="text-sm text-fg-tertiary">
            Start finding jobs that actually match you
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
          <div className="grid grid-cols-2 gap-3">
            <AuthInput
              label="First name"
              name="firstName"
              type="text"
              placeholder="Yara"
              autoComplete="given-name"
              required
            />
            <AuthInput
              label="Last name"
              name="lastName"
              type="text"
              placeholder="Mansour"
              autoComplete="family-name"
              required
            />
          </div>

          <AuthInput
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-fg-secondary"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            {/* Password strength indicators */}
            {password.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {passwordRules.map(({ label, test }) => {
                  const passed = test(password);
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                          passed
                            ? "bg-accent/20 border border-accent/40"
                            : "bg-white/2 border border-border-standard"
                        }`}
                      >
                        {passed && (
                          <Check className="w-2.5 h-2.5 text-accent-text" />
                        )}
                      </div>
                      <span
                        className={`text-xs transition-colors ${
                          passed ? "text-fg-secondary" : "text-fg-quaternary"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-xs text-fg-quaternary leading-relaxed">
            By creating an account you agree to our{" "}
            <Link
              href="/terms"
              className="text-fg-tertiary hover:text-accent-text transition-colors"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-fg-tertiary hover:text-accent-text transition-colors"
            >
              Privacy Policy
            </Link>
            .
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-bright text-bg-canvas font-medium text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-bg-canvas/30 border-t-bg-canvas rounded-full animate-spin" />
            ) : (
              <>
                Create account
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
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-fg-secondary hover:text-accent-text transition-colors font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}



