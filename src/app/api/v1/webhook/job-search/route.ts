import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/backend/lib/supabase/server";
import { createServiceClient } from "@/backend/lib/supabase/service";
import { encryptApiKey } from "@/backend/lib/crypto/api-key";
import { isAiProvider } from "@/backend/lib/ai/verify-key";
import { checkKeyFormat } from "@/frontend/lib/configs/provider-keys";
import { toUserMessage, logServerError, isConnectionError } from "@/backend/lib/errors";
import type { AiProvider } from "@/frontend/types/on-boarding";

export async function POST(request: NextRequest) {
  try {
    // ── 1. Authenticate the user ──────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── 2. Parse + validate body ──────────────────────────────
    const body = await request.json();

    const workPreference: string[] = Array.isArray(body.workPreference)
      ? body.workPreference
      : // Tolerates the pre-multi-select payload, which sent a single string.
        [body.workPreference].filter(Boolean);

    if (workPreference.length === 0 || !body.field) {
      return NextResponse.json(
        { error: "Missing required fields: workPreference, field" },
        { status: 400 }
      );
    }

    /*
     * Keys arrive as { provider: key }. Unknown providers and blank values are
     * dropped rather than rejected — a stale provider name in an old client
     * should not fail an otherwise complete submission.
     */
    const submittedKeys: Record<string, unknown> = body.aiKeys ?? {};
    const keyEntries = Object.entries(submittedKeys).filter(
      ([provider, key]) => isAiProvider(provider) && typeof key === "string" && key.trim()
    ) as [AiProvider, string][];

    /*
     * Existing credentials, because this endpoint is also Settings.
     *
     * A blank key field means "keep what is stored", not "clear it" — the
     * stored value is encrypted and never sent to the browser, so the form
     * cannot prefill it and a re-save would otherwise wipe it.
     */
    const service = createServiceClient();
    const { data: existing } = await service
      .from("user_preferences")
      .select("ai_keys_encrypted, apify_key_encrypted")
      .eq("user_id", user.id)
      .maybeSingle();

    const storedKeys = (existing?.ai_keys_encrypted ?? {}) as Partial<Record<AiProvider, string>>;
    const storedApifyKey: string | null = existing?.apify_key_encrypted ?? null;

    if (keyEntries.length === 0 && Object.keys(storedKeys).length === 0) {
      return NextResponse.json(
        { error: "At least one AI provider key is required" },
        { status: 400 }
      );
    }

    /*
     * Apify is optional: the self-hosted scraper covers the free sources, and a
     * token only adds LinkedIn and Indeed. A malformed one is still rejected —
     * storing a token that cannot work is worse than storing none.
     */
    const apifyKey = typeof body.apifyKey === "string" ? body.apifyKey.trim() : "";
    if (apifyKey) {
      const apifyFormat = checkKeyFormat("apify", apifyKey);
      if (!apifyFormat.ok) {
        return NextResponse.json(
          { error: `That Apify token can't be used. ${apifyFormat.reason}` },
          { status: 400 }
        );
      }
    }

    // ── 3. Encrypt every key + persist preferences ────────────
    // Newly typed keys win; anything left blank keeps the stored value.
    const encryptedKeys: Partial<Record<AiProvider, string>> = { ...storedKeys };
    for (const [provider, key] of keyEntries) {
      encryptedKeys[provider] = await encryptApiKey(key.trim());
    }

    /*
     * Deselecting a provider drops its key. Keeping it would leave a credential
     * on file for something the user has said they no longer want used.
     */
    const selected = new Set(
      body.aiProviders && Array.isArray(body.aiProviders) ? body.aiProviders : Object.keys(encryptedKeys)
    );
    for (const provider of Object.keys(encryptedKeys) as AiProvider[]) {
      if (!selected.has(provider)) delete encryptedKeys[provider];
    }

    const encryptedApifyKey = apifyKey ? await encryptApiKey(apifyKey) : storedApifyKey;

    /*
     * `countries` is a list now. A single-country payload from an older client
     * is folded into a one-element list rather than rejected.
     */
    const rawCountries = body.location?.countries ?? body.location?.country;
    const countries: string[] = Array.isArray(rawCountries)
      ? rawCountries.filter((c: unknown) => typeof c === "string" && c)
      : [rawCountries].filter((c: unknown) => typeof c === "string" && c);

    const location = { countries, worldwide: Boolean(body.location?.worldwide) };

    // A specific search has to name somewhere. The form blocks this, but the
    // form is not the guard.
    if (!location.worldwide && countries.length === 0) {
      return NextResponse.json(
        { error: "Select at least one country, or choose worldwide." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.jobTitles) || body.jobTitles.length === 0) {
      return NextResponse.json(
        { error: "At least one target job title is required." },
        { status: 400 }
      );
    }

    const { error: upsertError } = await service
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          work_preference: workPreference,
          location,
          field: body.field,
          skills: body.skills,
          experience: body.experience ?? 0,
          job_types: body.jobType ?? [],
          job_titles: body.jobTitles ?? [],
          seniority: body.seniority ?? "mid",
          ai_providers: Object.keys(encryptedKeys),
          ai_keys_encrypted: encryptedKeys,
          apify_key_encrypted: encryptedApifyKey,
          // Kept in step with ai_keys_encrypted so anything still reading the
          // single-provider column keeps working.
          groq_api_key_encrypted: encryptedKeys.groq ?? null,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      logServerError("webhook/job-search:upsert", upsertError);
      return NextResponse.json(
        { error: toUserMessage(upsertError, "We couldn't save your preferences. Please try again.") },
        { status: isConnectionError(upsertError) ? 503 : 500 }
      );
    }

    /*
     * ── 4. Queue the search, then answer ──────────────────────
     *
     * Collecting takes minutes, and the user used to sit on a spinner for all
     * of them. The request is recorded first so it survives an n8n that is slow
     * or down, the browser is answered straight away, and the trigger goes out
     * afterwards — see the `after` block below.
     */
    const { data: queued, error: queueError } = await service
      .from("search_requests")
      .insert({ user_id: user.id, kind: "onboarding", status: "queued" })
      .select("id")
      .single();

    if (queueError) {
      // Preferences are already saved, so this is not fatal: the hourly
      // collector will cover these titles regardless. Log it and carry on
      // rather than telling the user their onboarding failed.
      logServerError("webhook/job-search:queue", queueError);
    }

    const requestId: string | null = queued?.id ?? null;

    /*
     * ── 5. Forward to n8n with webhook secret ─────────────────
     *
     * The matcher, not a collector. This used to call a monolithic workflow
     * that scraped, spent the user's Apify credit and scored, all per user —
     * which is precisely what the split into public/private/on-demand
     * collectors replaced.
     *
     * So onboarding now only asks for scoring: the shared pool already holds
     * results to show immediately, and the private collector picks up this
     * user's new titles on its next run.
     */
    const n8nUrl = process.env.N8N_MATCH_WEBHOOK_URL;
    const n8nSecret = process.env.N8N_WEBHOOK_SECRET;

    if (!n8nUrl) {
      logServerError("webhook/job-search", new Error("N8N_MATCH_WEBHOOK_URL is not configured"));
      return NextResponse.json({
        success: true,
        queued: true,
        requestId,
        message: "Preferences saved. Your first search will run shortly.",
      });
    }

    const payload = {
      userId: user.id,
      workPreference,
      location,
      field: body.field,
      skills: body.skills,
      experience: body.experience ?? 0,
      jobType: body.jobType ?? [],
      jobTitles: body.jobTitles ?? [],
      seniority: body.seniority ?? "mid",
      // Plaintext keys go to n8n so it can call the provider — n8n is server-side
      // only. The first provider picked is the one the workflow should prefer.
      /*
       * Falls back to a provider that is on file but was not retyped. Saving
       * from Settings without touching the key fields leaves `keyEntries`
       * empty, and indexing it directly threw.
       *
       * Only freshly typed keys can be forwarded in plaintext — the stored ones
       * are encrypted, and decrypting them to hand to a workflow is exactly what
       * `/internal/match-candidates` exists to avoid.
       */
      aiProvider: keyEntries[0]?.[0] ?? (Object.keys(encryptedKeys)[0] as AiProvider | undefined) ?? null,
      aiKeys: Object.fromEntries(keyEntries),
      apifyKey,
      groqApiKey: submittedKeys.groq ?? "",
      timestamp: new Date().toISOString(),
    };

    /*
     * Runs once the response is already on its way to the browser, so the user
     * moves on to the marketing step while the collector is still starting up.
     *
     * The status write is the point: whatever happens to the trigger is on the
     * row, so "did my search actually start" has an answer that does not
     * involve opening n8n.
     */
    after(async () => {
      const mark = async (status: "running" | "failed", detail?: string) => {
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

      try {
        const n8nResponse = await fetch(n8nUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(n8nSecret ? { "X-Webhook-Secret": n8nSecret } : {}),
          },
          body: JSON.stringify({ ...payload, requestId }),
        });

        if (!n8nResponse.ok) {
          const text = await n8nResponse.text().catch(() => "");
          logServerError(
            "webhook/job-search:n8n",
            new Error(`n8n responded ${n8nResponse.status}`)
          );
          await mark("failed", `n8n responded ${n8nResponse.status}: ${text}`);
          return;
        }

        await mark("running");
      } catch (triggerError) {
        logServerError("webhook/job-search:trigger", triggerError);
        await mark("failed", "Could not reach the workflow.");
      }
    });

    return NextResponse.json({
      success: true,
      queued: true,
      requestId,
      message: "Your first search is running. This usually takes a few minutes.",
    });
  } catch (error) {
    // Never echo the raw message back — it exposes hostnames and internals.
    logServerError("webhook/job-search", error);
    return NextResponse.json(
      { error: toUserMessage(error, "We couldn't save your preferences. Please try again.") },
      { status: isConnectionError(error) ? 503 : 500 }
    );
  }
}
