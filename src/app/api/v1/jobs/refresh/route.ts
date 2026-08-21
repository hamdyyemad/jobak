import { NextResponse } from "next/server";
import { createClient } from "@/backend/lib/supabase/server";
import { createServiceClient } from "@/backend/lib/supabase/service";
import {
  toUserMessage,
  logServerError,
  isConnectionError,
  CONNECTION_MESSAGE,
} from "@/backend/lib/errors";

/**
 * Asks the matcher to score whatever the collectors have added since last time.
 *
 * This used to run the whole pipeline per user — scrape, score, insert — which
 * meant a refresh took minutes and re-collected listings other users had already
 * paid to fetch. Collection now runs on its own schedule into a shared pool, so
 * this only triggers the per-user half: narrow the pool, score what is new,
 * write the matches. Seconds, not minutes.
 *
 * No keys are sent. The matcher pulls the user's provider key and candidates
 * from `/api/v1/internal/match-candidates`, so a plaintext key never travels
 * with a request the browser can trigger.
 */

/** In-memory, per instance — enough to stop a held-down button. */
const MIN_INTERVAL_MS = 30_000;
const lastRun = new Map<string, number>();

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const previous = lastRun.get(user.id) ?? 0;
    const since = Date.now() - previous;
    if (since < MIN_INTERVAL_MS) {
      return NextResponse.json(
        {
          error: `Just refreshed. Try again in ${Math.ceil((MIN_INTERVAL_MS - since) / 1000)}s.`,
        },
        { status: 429 }
      );
    }

    // Onboarding has to be complete: without preferences there is nothing to
    // narrow the pool by, and without a key there is nothing to score with.
    const service = createServiceClient();
    const { data: prefs, error } = await service
      .from("user_preferences")
      .select("onboarding_completed, ai_keys_encrypted")
      .eq("user_id", user.id)
      .single();

    if (isConnectionError(error)) {
      logServerError("jobs/refresh:preferences", error);
      return NextResponse.json({ error: CONNECTION_MESSAGE }, { status: 503 });
    }

    if (error || !prefs?.onboarding_completed) {
      return NextResponse.json(
        { error: "Finish onboarding first so we know what to look for." },
        { status: 404 }
      );
    }

    const keys = prefs.ai_keys_encrypted;
    if (!keys || typeof keys !== "object" || Object.keys(keys).length === 0) {
      return NextResponse.json(
        { error: "No AI key on file. Add one to score your matches." },
        { status: 400 }
      );
    }

    const matchUrl = process.env.N8N_MATCH_WEBHOOK_URL;
    const secret = process.env.N8N_WEBHOOK_SECRET;

    if (!matchUrl) {
      // A configuration problem — say so in the log, not to the user.
      logServerError("jobs/refresh", new Error("N8N_MATCH_WEBHOOK_URL is not configured"));
      return NextResponse.json(
        { error: "Matching is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    lastRun.set(user.id, Date.now());

    const response = await fetch(matchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "X-Webhook-Secret": secret } : {}),
      },
      body: JSON.stringify({ userId: user.id }),
    });

    if (!response.ok) {
      logServerError("jobs/refresh:n8n", new Error(`matcher responded ${response.status}`));
      return NextResponse.json(
        { error: "We couldn't refresh your matches just now. Try again in a moment." },
        { status: 502 }
      );
    }

    const result = await response.json().catch(() => ({}));
    return NextResponse.json({ success: true, matched: result.matched ?? 0 });
  } catch (error) {
    logServerError("jobs/refresh", error);
    return NextResponse.json(
      { error: toUserMessage(error, "We couldn't refresh your matches. Please try again.") },
      { status: isConnectionError(error) ? 503 : 500 }
    );
  }
}
