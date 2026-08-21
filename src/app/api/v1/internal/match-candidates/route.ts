import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/backend/lib/supabase/service";
import { decryptApiKey } from "@/backend/lib/crypto/api-key";
import { logServerError } from "@/backend/lib/errors";
import { isAiProvider } from "@/backend/lib/ai/verify-key";

/**
 * The jobs worth scoring for one user, plus the key to score them with.
 *
 * The cheap half of matching happens in Postgres (`match_candidate_jobs`): it
 * narrows the shared pool by title, geography and workplace type, and drops
 * anything already scored for this user. Only what survives is handed to a
 * model, so the AI spend tracks new relevant listings rather than pool size.
 *
 * With no `userId` in the body, returns the list of users due a nightly pass —
 * that is the scheduled top-up's entry point.
 */

export const dynamic = "force-dynamic";

const DEFAULT_CANDIDATE_LIMIT = 40;
const MAX_CANDIDATE_LIMIT = 120;
/** Users per nightly batch, so one run cannot grow unbounded with signups. */
const MAX_NIGHTLY_USERS = 50;

function isAuthorized(request: NextRequest): boolean {
    const expected = process.env.N8N_WEBHOOK_SECRET;
    if (!expected) return false;
    const provided = request.headers.get("x-webhook-secret");
    if (typeof provided !== "string" || provided.length !== expected.length) return false;

    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
        diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
    }
    return diff === 0;
}

export async function POST(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const service = createServiceClient();

        // ── No user named: list who is due a scheduled pass ──
        if (!body?.userId) {
            const { data, error } = await service
                .from("user_preferences")
                .select("user_id")
                .eq("onboarding_completed", true)
                .limit(MAX_NIGHTLY_USERS);

            if (error) {
                logServerError("internal/match-candidates:list", error);
                return NextResponse.json({ error: "Could not list users" }, { status: 500 });
            }
            return NextResponse.json({ users: (data ?? []).map((r) => ({ userId: r.user_id })) });
        }

        const userId = String(body.userId);
        const limit = Math.min(Number(body.limit) || DEFAULT_CANDIDATE_LIMIT, MAX_CANDIDATE_LIMIT);

        // ── The user's scoring key ──
        const { data: prefs, error: prefsError } = await service
            .from("user_preferences")
            .select("ai_providers, ai_keys_encrypted, job_titles, location, work_preference, experience, seniority, skills, field")
            .eq("user_id", userId)
            .single();

        if (prefsError || !prefs) {
            return NextResponse.json({ error: "No preferences for that user" }, { status: 404 });
        }

        const stored: Record<string, string> =
            prefs.ai_keys_encrypted && typeof prefs.ai_keys_encrypted === "object"
                ? prefs.ai_keys_encrypted
                : {};

        const provider =
            (Array.isArray(prefs.ai_providers) &&
                prefs.ai_providers.find((p: string) => isAiProvider(p) && stored[p])) ||
            Object.keys(stored).find(isAiProvider);

        if (!provider) {
            return NextResponse.json({ error: "No AI key on file for that user" }, { status: 400 });
        }

        let aiApiKey: string;
        try {
            aiApiKey = await decryptApiKey(stored[provider]);
        } catch (decryptError) {
            logServerError("internal/match-candidates:decrypt", decryptError);
            return NextResponse.json({ error: "Could not read the stored key" }, { status: 500 });
        }

        // ── The candidates themselves ──
        const { data: jobs, error: rpcError } = await service.rpc("match_candidate_jobs", {
            p_user_id: userId,
            p_limit: limit,
        });

        if (rpcError) {
            logServerError("internal/match-candidates:rpc", rpcError);
            return NextResponse.json({ error: "Could not select candidates" }, { status: 500 });
        }

        return NextResponse.json({
            userId,
            aiProvider: provider,
            aiApiKey,
            profile: {
                field: prefs.field,
                jobTitles: prefs.job_titles ?? [],
                skills: prefs.skills ?? [],
                experience: prefs.experience ?? 0,
                seniority: prefs.seniority ?? "mid",
                workPreference: prefs.work_preference ?? [],
                location: prefs.location ?? { countries: [], worldwide: true },
            },
            jobs: jobs ?? [],
            count: (jobs ?? []).length,
        });
    } catch (error) {
        logServerError("internal/match-candidates", error);
        return NextResponse.json({ error: "Could not build match candidates" }, { status: 500 });
    }
}
