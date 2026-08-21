"use client";
import { useSearchParams } from "next/navigation";
import { MailCheck } from "lucide-react";

const MAX_LENGTH = 200;

/**
 * Renders the `?error=` and `?notice=` messages other auth flows redirect back
 * with: OAuth callback failures, and the "confirm your email" state after signup.
 *
 * Kept apart from the sign-in form on purpose: `useSearchParams` forces its
 * subtree behind a Suspense boundary on a statically rendered route, and the
 * form itself should still be in the initial HTML.
 */
export function AuthNotice() {
  const params = useSearchParams();
  const error = params.get("error");
  const notice = params.get("notice");

  if (error) {
    return (
      <div
        role="alert"
        className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400"
      >
        {error.slice(0, MAX_LENGTH)}
      </div>
    );
  }

  if (notice === "verify-email") {
    const email = params.get("email");

    return (
      <div
        role="status"
        className="px-4 py-4 rounded-xl bg-(--accent-bg) border border-accent/30 flex gap-3"
      >
        <MailCheck className="w-4 h-4 text-accent-text shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-fg-primary mb-1">Confirm your email to continue</p>
          <p className="text-fg-secondary leading-relaxed">
            {email ? (
              <>
                We sent a verification link to{" "}
                <span className="text-fg-primary break-all">{email.slice(0, MAX_LENGTH)}</span>.
                Open it, and you can sign in here.
              </>
            ) : (
              "We sent you a verification link. Open it, and you can sign in here."
            )}
          </p>
        </div>
      </div>
    );
  }

  return null;
}
