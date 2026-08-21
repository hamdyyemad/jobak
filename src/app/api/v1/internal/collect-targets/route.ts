import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/backend/lib/supabase/service";
import { decryptApiKey } from "@/backend/lib/crypto/api-key";
import { logServerError } from "@/backend/lib/errors";

/**
 * What the scheduled collectors should go and fetch.
 *
 * Called by n8n, not by a browser. It exists so that decryption stays in the
 * app: n8n would otherwise need `ENCRYPTION_SECRET`, which would put every
 * user's provider keys one compromised workflow away from being readable.
 *
 * Returns two things:
 *  - `freeTerms`  — the distinct (title, country) pairs worth collecting for
 *                   anyone. The self-hosted scraper costs nothing per call, so
 *                   this is deduplicated across the whole user base.
 *  - `apifyUsers` — users who connected a token, each with *their own* search
 *                   terms. A paid token is only ever spent on the search its
 *                   owner asked for; the results land in the shared pool and
 *                   benefit everyone incidentally.
 */

export const dynamic = "force-dynamic";

/** Caps a single scheduled run so one huge user base cannot stall the workflow. */
const MAX_FREE_TERMS = 60;
const MAX_APIFY_USERS = 25;

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

interface PrefRow {
    user_id: string;
    job_titles: string[] | null;
    location: { countries?: string[]; worldwide?: boolean } | null;
    work_preference: string[] | null;
    apify_key_encrypted: string | null;
}

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const service = createServiceClient();
        const { data, error } = await service
            .from("user_preferences")
            .select("user_id, job_titles, location, work_preference, apify_key_encrypted")
            .eq("onboarding_completed", true);

        if (error) {
            logServerError("internal/collect-targets:select", error);
            return NextResponse.json({ error: "Could not read preferences" }, { status: 500 });
        }

        const rows = (data ?? []) as PrefRow[];

        // ── Free collector: one entry per distinct title+country pair ──
        const freeSeen = new Set<string>();
        const freeTerms: { term: string; countries: string[]; worldwide: boolean }[] = [];

        for (const row of rows) {
            const titles = (row.job_titles ?? []).filter(Boolean);
            const worldwide = Boolean(row.location?.worldwide);
            const countries = worldwide ? [] : (row.location?.countries ?? []).filter(Boolean);

            for (const term of titles) {
                // Deduped across users: two people hunting "Backend Engineer" in
                // Egypt is one collection job, not two.
                const key = `${term.toLowerCase()}|${countries.slice().sort().join(",")}|${worldwide}`;
                if (freeSeen.has(key)) continue;
                freeSeen.add(key);
                freeTerms.push({ term, countries, worldwide });
                if (freeTerms.length >= MAX_FREE_TERMS) break;
            }
            if (freeTerms.length >= MAX_FREE_TERMS) break;
        }

        // ── Apify collector: per user, their own terms only ──
        const apifyUsers: {
            userId: string;
            apifyKey: string;
            terms: string[];
            countries: string[];
            worldwide: boolean;
            workPreference: string[];
        }[] = [];

        for (const row of rows) {
            if (!row.apify_key_encrypted) continue;
            if (apifyUsers.length >= MAX_APIFY_USERS) break;

            const titles = (row.job_titles ?? []).filter(Boolean);
            if (titles.length === 0) continue;

            let apifyKey: string;
            try {
                apifyKey = await decryptApiKey(row.apify_key_encrypted);
            } catch (decryptError) {
                // A key encrypted under a rotated secret should skip that user,
                // not fail the whole scheduled run.
                logServerError("internal/collect-targets:decrypt", decryptError);
                continue;
            }

            const worldwide = Boolean(row.location?.worldwide);
            apifyUsers.push({
                userId: row.user_id,
                apifyKey,
                terms: titles,
                countries: worldwide ? [] : (row.location?.countries ?? []).filter(Boolean),
                worldwide,
                workPreference: row.work_preference ?? [],
            });
        }

        return NextResponse.json({
            freeTerms,
            apifyUsers,
            meta: {
                activeUsers: rows.length,
                freeTermCount: freeTerms.length,
                apifyUserCount: apifyUsers.length,
                generatedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        logServerError("internal/collect-targets", error);
        return NextResponse.json({ error: "Could not build collection targets" }, { status: 500 });
    }
}
