import { NextRequest, NextResponse } from "next/server";
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

    if (keyEntries.length === 0) {
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
    const encryptedKeys: Partial<Record<AiProvider, string>> = {};
    for (const [provider, key] of keyEntries) {
      encryptedKeys[provider] = await encryptApiKey(key.trim());
    }
    const encryptedApifyKey = apifyKey ? await encryptApiKey(apifyKey) : null;

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

    const service = createServiceClient();
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
          ai_providers: keyEntries.map(([provider]) => provider),
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

    // ── 4. Forward to n8n with webhook secret ─────────────────
    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    const n8nSecret = process.env.N8N_WEBHOOK_SECRET;

    if (!n8nUrl) {
      return NextResponse.json(
        { error: "N8N_WEBHOOK_URL not configured" },
        { status: 500 }
      );
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
      aiProvider: keyEntries[0][0],
      aiKeys: Object.fromEntries(keyEntries),
      apifyKey,
      groqApiKey: submittedKeys.groq ?? "",
      timestamp: new Date().toISOString(),
    };

    const n8nResponse = await fetch(n8nUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(n8nSecret ? { "X-Webhook-Secret": n8nSecret } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!n8nResponse.ok) {
      const text = await n8nResponse.text().catch(() => "");
      console.error("n8n webhook error:", n8nResponse.status, text);
      // Return success to user anyway — preferences are saved; n8n can be retried
      return NextResponse.json({
        success: true,
        message: "Preferences saved. Job search will run shortly.",
        n8nWarning: "Workflow trigger failed — it will be retried.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Onboarding complete. Job search started.",
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
