import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/backend/lib/supabase/server";
import { logServerError, toUserMessage } from "@/backend/lib/errors";

/**
 * Email confirmation endpoint.
 *
 * Uses `verifyOtp` with the token hash from the email rather than the PKCE code
 * exchange in /auth/callback. That matters: PKCE needs the code verifier cookie
 * from the browser that started the signup, so a link opened on a phone after
 * signing up on a laptop would fail. A token hash carries no such requirement.
 */

const DEFAULT_DESTINATION = "/onboarding";

/** Same-site absolute paths only, so the link cannot be turned into an open redirect. */
function safeDestination(raw: string | null): string {
  if (!raw) return DEFAULT_DESTINATION;
  if (!raw.startsWith("/") || raw.startsWith("//")) return DEFAULT_DESTINATION;
  return raw;
}

function failed(request: NextRequest, message: string) {
  const url = new URL("/login", request.nextUrl.origin);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!tokenHash || !type) {
    return failed(request, "That confirmation link is incomplete. Please request a new one.");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (error) {
      logServerError("auth/confirm:verify", error);
      return failed(
        request,
        toUserMessage(
          error,
          "That confirmation link has expired or was already used. Sign in to get a new one."
        )
      );
    }
  } catch (error) {
    logServerError("auth/confirm", error);
    return failed(request, toUserMessage(error, "We couldn't confirm your email."));
  }

  return NextResponse.redirect(
    new URL(safeDestination(searchParams.get("next")), origin)
  );
}
