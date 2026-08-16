"use client";
import { useSearchParams } from "next/navigation";

const MAX_LENGTH = 200;

/**
 * Shows the `?error=` message the OAuth callback redirects back with.
 *
 * Kept apart from the sign-in form on purpose: `useSearchParams` forces its
 * subtree behind a Suspense boundary on a statically rendered route, and the
 * form itself should still be in the initial HTML.
 */
export function AuthErrorBanner() {
  const message = useSearchParams().get("error");
  if (!message) return null;

  return (
    <div
      role="alert"
      className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400"
    >
      {message.slice(0, MAX_LENGTH)}
    </div>
  );
}
