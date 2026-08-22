import { NextResponse, after } from "next/server";
import { createClient } from "@/backend/lib/supabase/server";
import { createServiceClient } from "@/backend/lib/supabase/service";
import {
  toUserMessage,
  logServerError,
  isConnectionError,
  CONNECTION_MESSAGE,
} from "@/backend/lib/errors";

/**
 * The dashboard's Search button.
 *
 * Two halves, in order:
 *
 *  1. **Collect** — if this user connected an Apify token, run the actors for
 *     their own search terms. This is the *only* place Apify ever runs. It is
 *     never scheduled: the token is the user's, the credit is theirs, and a
 *     cron would spend it on searches they did not ask for. Users without a
 *     token skip straight to scoring, since the free collector has already been
 *     filling the shared pool hourly.
 *
 *  2. **Score** — narrow the pool for this user and write the matches.
 *
 * Neither is awaited. Collection runs to minutes, so the request is recorded in
 * `search_requests`, the browser is answered immediately, and the triggers go
 * out after the response.
 *
 * No keys are sent to either workflow. They pull the user's token and
 * candidates from the internal endpoints, so a plaintext key never travels with
 * a request the browser can trigger.
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
          error: `Just searched. Try again in ${Math.ceil((MIN_INTERVAL_MS - since) / 1000)}s.`,
        },
        { status: 429 }
      );
    }

    // Onboarding has to be complete: without preferences there is nothing to
    // narrow the pool by, and without a key there is nothing to score with.
    const service = createServiceClient();
    const { data: prefs, error } = await service
      .from("user_preferences")
      .select("onboarding_completed, ai_keys_encrypted, apify_key_encrypted")
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
    const apifyUrl = process.env.N8N_APIFY_WEBHOOK_URL;
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

    const usesApify = Boolean(prefs.apify_key_encrypted && apifyUrl);

    const { data: queued, error: queueError } = await service
      .from("search_requests")
      .insert({ user_id: user.id, kind: "dashboard", status: "queued" })
      .select("id")
      .single();

    if (queueError) logServerError("jobs/refresh:queue", queueError);
    const requestId: string | null = queued?.id ?? null;

    after(async () => {
      const mark = async (status: "running" | "done" | "failed", detail?: string) => {
        if (!requestId) return;
        await service
          .from("search_requests")
          .update({
            status,
            detail: detail?.slice(0, 400) ?? null,
            ...(status === "running"
              ? { started_at: new Date().toISOString() }
              : { finished_at: new Date().toISOString() }),
          })
          .eq("id", requestId);
      };

      const trigger = (url: string) =>
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(secret ? { "X-Webhook-Secret": secret } : {}),
          },
          body: JSON.stringify({ userId: user.id, requestId }),
        });

      try {
        await mark("running");

        /*
         * Collection first, and awaited, so the matcher scores a pool that
         * already contains whatever Apify just found. A failure here is not
         * fatal: the free sources have been collecting all along, so scoring
         * what is already in the pool is still worth doing.
         */
        if (usesApify) {
          try {
            const collected = await trigger(apifyUrl as string);
            if (!collected.ok) {
              logServerError(
                "jobs/refresh:apify",
                new Error(`apify collector responded ${collected.status}`)
              );
            }
          } catch (collectError) {
            logServerError("jobs/refresh:apify", collectError);
          }
        }

        const scored = await trigger(matchUrl);
        if (!scored.ok) {
          logServerError("jobs/refresh:n8n", new Error(`matcher responded ${scored.status}`));
          await mark("failed", `Matcher responded ${scored.status}.`);
          return;
        }

        await mark("done");
      } catch (triggerError) {
        logServerError("jobs/refresh:trigger", triggerError);
        await mark("failed", "Could not reach the workflow.");
      }
    });

    return NextResponse.json({
      success: true,
      queued: true,
      requestId,
      usesApify,
      message: usesApify
        ? "Searching your sources. New roles appear as they land — this takes a few minutes."
        : "Scoring the latest roles for you. This usually takes under a minute.",
    });
  } catch (error) {
    logServerError("jobs/refresh", error);
    return NextResponse.json(
      { error: toUserMessage(error, "We couldn't start your search. Please try again.") },
      { status: isConnectionError(error) ? 503 : 500 }
    );
  }
}
