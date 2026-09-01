import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/backend/lib/supabase/server";
import { createServiceClient } from "@/backend/lib/supabase/service";
import { decryptApiKey } from "@/backend/lib/crypto/api-key";
import { isAiProvider } from "@/backend/lib/ai/verify-key";
import { AiError, complete } from "@/backend/lib/ai/complete";
import { buildPrompt, isDocumentKind, MAX_TOKENS, type DocumentContext } from "@/backend/lib/ai/documents";
import { logServerError } from "@/backend/lib/errors";
import type { AiProvider } from "@/frontend/types/on-boarding";

/**
 * Generates one application document with the signed-in user's own AI key.
 *
 * Deliberately a route rather than a server action: it is called repeatedly
 * from the job drawer and the documents page, sometimes for four kinds at once,
 * and a route gives one place to rate-limit and one shape to handle errors in.
 *
 * The key is decrypted here and used here. It is never returned to the browser,
 * never logged, and never sent anywhere except the provider the user chose —
 * the same rule `/internal/match-candidates` exists to enforce.
 */

export const dynamic = "force-dynamic";
/** Model calls take real time; the default 15s would cut long CV reviews off. */
export const maxDuration = 60;

/**
 * In-memory, per instance. Enough to stop a stuck loop or a held-down button
 * from spending someone's credit, not a substitute for provider-side limits.
 */
const MIN_INTERVAL_MS = 3_000;
const lastCall = new Map<string, number>();

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const previous = lastCall.get(user.id) ?? 0;
        const since = Date.now() - previous;
        if (since < MIN_INTERVAL_MS) {
            return NextResponse.json(
                { error: "One at a time — try again in a second." },
                { status: 429 }
            );
        }

        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

        // Narrowed into its own const: `body` is untyped, so `body.kind` stays
        // `any` after the guard and cannot index the token table.
        const kind = body.kind;
        if (!isDocumentKind(kind)) {
            return NextResponse.json({ error: "Unknown document type." }, { status: 400 });
        }

        const jobDescription = String(body.jobDescription ?? "").trim();
        if (jobDescription.length < 80) {
            return NextResponse.json(
                { error: "Paste a bit more of the job description — there isn't enough to work from." },
                { status: 400 }
            );
        }

        /*
         * Preferences and keys come from the service client because
         * `ai_keys_encrypted` is not readable under the user's own RLS policy —
         * that column is write-only from the app's perspective by design.
         */
        const service = createServiceClient();
        const { data: prefs, error: prefsError } = await service
            .from("user_preferences")
            .select("ai_providers, ai_keys_encrypted, field, job_titles, skills, experience, seniority, location")
            .eq("user_id", user.id)
            .maybeSingle();

        if (prefsError || !prefs) {
            return NextResponse.json(
                { error: "Finish onboarding first so we know what to write about." },
                { status: 404 }
            );
        }

        const stored: Record<string, string> =
            prefs.ai_keys_encrypted && typeof prefs.ai_keys_encrypted === "object"
                ? prefs.ai_keys_encrypted
                : {};

        const provider =
            (Array.isArray(prefs.ai_providers) &&
                (prefs.ai_providers as string[]).find((name) => isAiProvider(name) && stored[name])) ||
            Object.keys(stored).find(isAiProvider);

        if (!provider) {
            return NextResponse.json(
                { error: "No AI key on file. Add one in Settings to generate documents." },
                { status: 400 }
            );
        }

        let apiKey: string;
        try {
            apiKey = await decryptApiKey(stored[provider]);
        } catch (error) {
            logServerError("ai/documents:decrypt", error);
            return NextResponse.json({ error: "Couldn't read your stored key." }, { status: 500 });
        }

        const location = (prefs.location ?? {}) as { countries?: string[]; worldwide?: boolean };
        const context: DocumentContext = {
            jobTitle: body.jobTitle ? String(body.jobTitle).slice(0, 200) : undefined,
            company: body.company ? String(body.company).slice(0, 200) : undefined,
            jobDescription,
            profile: {
                field: prefs.field,
                jobTitles: prefs.job_titles ?? [],
                skills: prefs.skills ?? [],
                experience: prefs.experience ?? 0,
                seniority: prefs.seniority,
                location: location.worldwide ? "Open to anywhere" : (location.countries ?? []).join(", "),
            },
            cvText: body.cvText ? String(body.cvText).slice(0, 8000) : undefined,
        };

        const { system, prompt } = buildPrompt(kind, context);

        lastCall.set(user.id, Date.now());

        const text = await complete({
            provider: provider as AiProvider,
            apiKey,
            system,
            prompt,
            maxTokens: MAX_TOKENS[kind],
        });

        return NextResponse.json({ kind, text, provider });
    } catch (error) {
        if (error instanceof AiError) {
            // The provider's own message names internal endpoints, so the user
            // gets the translated one and the log gets the detail.
            logServerError("ai/documents:provider", error);
            return NextResponse.json({ error: error.userMessage }, { status: error.status ?? 502 });
        }

        logServerError("ai/documents", error);
        return NextResponse.json({ error: "Couldn't generate that. Please try again." }, { status: 500 });
    }
}
