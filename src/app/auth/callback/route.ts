import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/backend/lib/supabase/server";
import { logServerError, toUserMessage } from "@/backend/lib/errors";

/**
 * OAuth callback.
 *
 * `@supabase/ssr` uses the PKCE flow, so the provider sends back a short-lived
 * code that has to be exchanged for a session here, server-side, where the
 * session cookie can actually be written. Without this route the OAuth buttons
 * bounce the user back with a code that nothing ever redeems.
 */

const DEFAULT_DESTINATION = "/dashboard";

/**
 * Only same-site absolute paths are allowed through. Without this an attacker
 * could craft `?next=//evil.example` and turn the callback into an open redirect.
 */
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

  // The provider itself can refuse (user cancelled, app misconfigured)
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    logServerError("auth/callback:provider", new Error(providerError));
    return failed(request, "That sign-in was cancelled or refused. Please try again.");
  }

  const code = searchParams.get("code");
  if (!code) {
    return failed(request, "That sign-in link is incomplete. Please try again.");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logServerError("auth/callback:exchange", error);
      return failed(request, toUserMessage(error, "We couldn't complete that sign-in."));
    }
  } catch (error) {
    logServerError("auth/callback", error);
    return failed(request, toUserMessage(error, "We couldn't complete that sign-in."));
  }

  // Middleware decides whether they land on the dashboard or finish onboarding
  return NextResponse.redirect(
    new URL(safeDestination(searchParams.get("next")), origin)
  );
}
