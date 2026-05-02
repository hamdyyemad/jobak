"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Check } from "lucide-react";
import { AuthLayout } from "@/frontend/components/auth/auth-layout";
import { AuthInput } from "@/frontend/components/auth/auth-input";
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
              placeholder="Sarah"
              autoComplete="given-name"
              required
            />
            <AuthInput
              label="Last name"
              name="lastName"
              type="text"
              placeholder="Kim"
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
        <div className="grid grid-cols-2 gap-3">
          <OAuthButton provider="Google" />
          <OAuthButton provider="GitHub" />
        </div>

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

function OAuthButton({ provider }: { provider: "Google" | "GitHub" }) {
  return (
    <button
      type="button"
      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/2 border border-border-standard hover:bg-white/4 hover:border-border-strong text-fg-secondary text-sm font-medium transition-all"
    >
      {provider === "Google" ? <GoogleIcon /> : <GitHubIcon />}
      {provider}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      className="w-4 h-4 text-fg-primary"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
