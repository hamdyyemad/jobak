import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/backend/lib/supabase/server";
import { isCredentialProvider, verifyKey } from "@/backend/lib/ai/verify-key";
import { logServerError } from "@/backend/lib/errors";

/**
 * Checks one AI provider key against that provider, without storing it.
 *
 * Sign-in is required: this endpoint makes an outbound authenticated request on
 * request, so leaving it open would turn the app into a free credential oracle
 * for anyone testing stolen keys against four providers at once.
 */

/**
 * Per-user throttle. In memory, so it resets on deploy and is per-instance —
 * enough to stop a tight loop from one session, not a substitute for the real
 * rate limiting tracked in docs/general/PRE_PRODUCTION.md.
 */
const MAX_CHECKS = 12;
const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function overLimit(userId: string): boolean {
    const now = Date.now();
    const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
    recent.push(now);
    hits.set(userId, recent);
    return recent.length > MAX_CHECKS;
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (overLimit(user.id)) {
            return NextResponse.json(
                { error: "Too many checks. Wait a minute and try again." },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { provider, apiKey } = body ?? {};

        if (!isCredentialProvider(provider)) {
            return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
        }
        if (typeof apiKey !== "string" || !apiKey.trim()) {
            return NextResponse.json({ error: "API key is required" }, { status: 400 });
        }

        const result = await verifyKey(provider, apiKey);
        return NextResponse.json({ provider, ...result });
    } catch (error) {
        // The body holds a live API key — log the context only, never the payload.
        logServerError("ai/verify-key", error);
        return NextResponse.json({ error: "Couldn't run the check. Please try again." }, { status: 500 });
    }
}
