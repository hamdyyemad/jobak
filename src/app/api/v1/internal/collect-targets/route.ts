import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/backend/lib/supabase/service";
import { decryptApiKey } from "@/backend/lib/crypto/api-key";
import { logServerError } from "@/backend/lib/errors";

/**
 * One user's Apify collection target.
 *
 * Called by n8n, not by a browser, and only when that user pressed Search.
 * Returns their token and their own search terms — nothing belonging to anyone
 * else, and nothing at all without a `userId`.
 *
 * This is the last thing the collectors still ask the app for, and it is here
 * for one reason: it decrypts an Apify token. `ENCRYPTION_SECRET` must never
 * reach n8n or Postgres, so the decryption cannot move with the rest.
 *
 * The scheduled collectors used to call this too. They now call the Postgres
 * functions `collect_targets_public()` and `collect_targets_private()` instead
 * — see `db/supabase/007_collect_targets_rpc.sql`. Everything those need (catalogue,
 * cursor, preferences) was already in the database, so the round trip through a
 * serverless function bought nothing but a timeout risk. Keeping a second copy
 * of that logic here would be the same drift that has broken this pipeline
 * before, so it is gone rather than deprecated.
 */

export const dynamic = "force-dynamic";

/**
 * `userId` decides whose Apify token this endpoint decrypts and hands out, so
 * it is checked for shape before it is used to look anything up. The workflow
 * validates it too; this is here so the guarantee does not depend on a workflow
 * anyone can re-import and edit.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PrefRow {
    user_id: string;
    job_titles: string[] | null;
    location: { countries?: string[]; worldwide?: boolean } | null;
    work_preference: string[] | null;
    apify_key_encrypted: string | null;
    /** Optional: absent entirely on the pre-migration fallback select below. */
    apify_actors?: string[] | null;
}

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

export async function GET(request: NextRequest) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId || !UUID.test(userId)) {
        return NextResponse.json(
            { error: "A well-formed userId is required" },
            { status: 400 }
        );
    }

    try {
        const service = createServiceClient();

        const BASE = "user_id, job_titles, location, work_preference, apify_key_encrypted";

        /*
         * `apify_actors` arrives with db/supabase/008_apify_marketplace.sql. Until it
         * does, selecting it fails the query and this endpoint reports "no such
         * user" — which stops Apify collection entirely rather than falling
         * back to the catalogue defaults.
         */
        let { data, error } = await service
            .from("user_preferences")
            .select(`${BASE}, apify_actors`)
            .eq("user_id", userId)
            .eq("onboarding_completed", true)
            .single();

        if (error) {
            ({ data, error } = await service
                .from("user_preferences")
                .select(BASE)
                .eq("user_id", userId)
                .eq("onboarding_completed", true)
                .single());
        }

        if (error || !data) {
            return NextResponse.json({ apifyUsers: [], meta: { reason: "no such user" } });
        }

        const row = data as PrefRow;
        const titles = (row.job_titles ?? []).filter(Boolean);

        if (!row.apify_key_encrypted || titles.length === 0) {
            // Not an error: most users never connect a token, and the free
            // collectors keep filling the pool for them regardless.
            return NextResponse.json({
                apifyUsers: [],
                meta: { reason: row.apify_key_encrypted ? "no job titles" : "no apify token" },
            });
        }

        let apifyKey: string;
        try {
            apifyKey = await decryptApiKey(row.apify_key_encrypted);
        } catch (decryptError) {
            logServerError("internal/collect-targets:decrypt", decryptError);
            return NextResponse.json({ apifyUsers: [], meta: { reason: "key undecryptable" } });
        }

        const worldwide = Boolean(row.location?.worldwide);
        return NextResponse.json({
            apifyUsers: [
                {
                    userId: row.user_id,
                    apifyKey,
                    terms: titles,
                    countries: worldwide ? [] : (row.location?.countries ?? []).filter(Boolean),
                    worldwide,
                    workPreference: row.work_preference ?? [],
                    /*
                     * Which paid actors this user switched on in the
                     * marketplace. An empty array is meaningful: the collector
                     * reads it as "the catalogue defaults", so a user who never
                     * opened the marketplace still collects from the
                     * recommended set rather than from nothing.
                     */
                    apifyActors: row.apify_actors ?? [],
                },
            ],
            meta: { onDemand: true, generatedAt: new Date().toISOString() },
        });
    } catch (error) {
        logServerError("internal/collect-targets", error);
        return NextResponse.json({ error: "Could not build collection targets" }, { status: 500 });
    }
}
