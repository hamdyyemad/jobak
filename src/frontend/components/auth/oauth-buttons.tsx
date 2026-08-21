"use client";
import { useState } from "react";
import { createClient } from "@/backend/lib/supabase/client";

/**
 * `linkedin_oidc`, not `linkedin`: LinkedIn moved to OpenID Connect and Supabase
 * retired the legacy provider in January 2024. The old slug fails at sign-in.
 */
type Provider = "google" | "github" | "linkedin_oidc";

const PROVIDERS: { id: Provider; label: string; Icon: () => React.ReactElement }[] = [
  { id: "google", label: "Google", Icon: GoogleIcon },
  { id: "github", label: "GitHub", Icon: GitHubIcon },
  { id: "linkedin_oidc", label: "LinkedIn", Icon: LinkedInIcon },
];

const labelFor = (provider: Provider) =>
  PROVIDERS.find((p) => p.id === provider)?.label ?? "That provider";

/**
 * OAuth sign-in. Shared by login and register, which previously each carried
 * their own copy of these buttons with no click handler attached at all.
 */
export function OAuthButtons({ next }: { next?: string }) {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (provider: Provider) => {
    setPending(provider);
    setError(null);

    try {
      const supabase = createClient();
      const callback = new URL("/auth/callback", window.location.origin);
      if (next) callback.searchParams.set("next", next);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callback.toString() },
      });

      // On success the browser navigates away, so `pending` is left set on purpose.
      if (oauthError) throw oauthError;
    } catch (caught) {
      setPending(null);
      setError(describe(caught, provider));
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <p
          role="alert"
          className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400"
        >
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {PROVIDERS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => signIn(id)}
            disabled={pending !== null}
            aria-busy={pending === id}
            className="flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl bg-white/2 border border-border-standard hover:bg-white/4 hover:border-border-strong text-fg-secondary text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {pending === id ? (
              <span className="w-4 h-4 border-2 border-fg-quaternary border-t-fg-secondary rounded-full animate-spin shrink-0" />
            ) : (
              <Icon />
            )}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Supabase reports an unconfigured provider generically, so name the cause. */
function describe(error: unknown, provider: Provider): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const name = labelFor(provider);

  if (/not enabled|unsupported provider|provider is not enabled/i.test(message)) {
    return `${name} sign-in is not enabled for this app yet. Use your email and password for now.`;
  }
  if (/fetch|network|failed to fetch/i.test(message)) {
    return "We can't reach our servers right now. Check your connection and try again.";
  }
  return `We couldn't start ${name} sign-in. Please try again.`;
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
      className="w-4 h-4 shrink-0 text-fg-primary"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}
