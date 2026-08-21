import { NextResponse } from "next/server";
import { createClient } from "@/backend/lib/supabase/server";
import { createServiceClient } from "@/backend/lib/supabase/service";
import { decryptApiKey } from "@/backend/lib/crypto/api-key";
import {
  toUserMessage,
  logServerError,
  isConnectionError,
  CONNECTION_MESSAGE,
} from "@/backend/lib/errors";

export async function POST() {
  try {
    return await handleRefresh();
  } catch (error) {
    logServerError("jobs/refresh", error);
    return NextResponse.json(
      { error: toUserMessage(error, "We couldn't start your job search. Please try again.") },
      { status: isConnectionError(error) ? 503 : 500 }
    );
  }
}

async function handleRefresh() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: prefs, error } = await service
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // A connection failure is not the same as "you haven't onboarded yet"
  if (isConnectionError(error)) {
    logServerError("jobs/refresh:preferences", error);
    return NextResponse.json({ error: CONNECTION_MESSAGE }, { status: 503 });
  }

  if (error || !prefs) {
    return NextResponse.json(
      { error: "No preferences found. Complete onboarding first." },
      { status: 404 }
    );
  }

  /*
   * Keys live in `ai_keys_encrypted` keyed by provider. Rows written before
   * multi-provider support only have the single Groq column, so that is read as
   * a fallback rather than forcing those users back through onboarding.
   */
  const stored: Record<string, string> =
    prefs.ai_keys_encrypted && typeof prefs.ai_keys_encrypted === "object"
      ? prefs.ai_keys_encrypted
      : prefs.groq_api_key_encrypted
        ? { groq: prefs.groq_api_key_encrypted }
        : {};

  const aiKeys: Record<string, string> = {};
  try {
    for (const [provider, encrypted] of Object.entries(stored)) {
      aiKeys[provider] = await decryptApiKey(encrypted);
    }
  } catch (decryptError) {
    logServerError("jobs/refresh:decrypt", decryptError);
    return NextResponse.json(
      { error: "We couldn't read your saved API key. Re-enter it to continue." },
      { status: 500 }
    );
  }

  if (Object.keys(aiKeys).length === 0) {
    return NextResponse.json(
      { error: "No AI key on file. Add one to start a search." },
      { status: 400 }
    );
  }

  // The provider the user picked first is the one the workflow should prefer.
  const preferredProvider: string =
    (Array.isArray(prefs.ai_providers) && prefs.ai_providers.find((p: string) => aiKeys[p])) ??
    Object.keys(aiKeys)[0];

  /*
   * Apify collects the listings, so a refresh without it has nothing to score.
   * Rows written before Apify became mandatory have no token — those users are
   * sent back to onboarding rather than silently running an empty search.
   */
  let apifyKey = "";
  if (prefs.apify_key_encrypted) {
    try {
      apifyKey = await decryptApiKey(prefs.apify_key_encrypted);
    } catch (decryptError) {
      logServerError("jobs/refresh:decrypt-apify", decryptError);
      return NextResponse.json(
        { error: "We couldn't read your saved Apify token. Re-enter it to continue." },
        { status: 500 }
      );
    }
  }

  if (!apifyKey) {
    return NextResponse.json(
      { error: "No Apify token on file. Add one to start a search." },
      { status: 400 }
    );
  }

  const n8nUrl = process.env.N8N_WEBHOOK_URL;
  const n8nSecret = process.env.N8N_WEBHOOK_SECRET;

  if (!n8nUrl) {
    // Configuration problem — say so in the log, not to the user
    logServerError("jobs/refresh", new Error("N8N_WEBHOOK_URL is not configured"));
    return NextResponse.json(
      { error: "Job search is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }

  const payload = {
    userId: user.id,
    workPreference: prefs.work_preference,
    location: prefs.location,
    field: prefs.field,
    skills: prefs.skills,
    experience: prefs.experience,
    jobType: prefs.job_types,
    jobTitles: prefs.job_titles ?? [],
    seniority: prefs.seniority,
    salary: prefs.salary,
    aiProvider: preferredProvider,
    aiKeys,
    apifyKey,
    groqApiKey: aiKeys.groq ?? "",
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
    logServerError(
      "jobs/refresh:n8n",
      new Error(`n8n responded ${n8nResponse.status}`)
    );
    return NextResponse.json(
      { error: "We couldn't start your job search just now. Please try again in a moment." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
