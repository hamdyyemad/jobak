import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAuthorized, reject } from "../src/auth.js";
import { runSearch } from "../src/core/pipeline.js";
import { APIFY_ACTORS, defaultActorKeys, selectActors } from "../src/apify/catalogue.js";
import { ApifySource } from "../src/sources/apify/ApifySource.js";
import type { Country, SearchRequest } from "../src/core/types.js";

/**
 * The Apify half of collection: the marketplace, and the runs.
 *
 * Separate from `/api/scrape` for one reason that matters more than tidiness —
 * **this endpoint spends the user's money.** Keeping it apart makes the rule
 * enforceable rather than aspirational: nothing scheduled calls this, only the
 * dashboard's Search button and onboarding do, and the token arrives per
 * request instead of sitting in an environment variable where a cron could
 * reach it.
 *
 *   GET  /api/apify            → the catalogue, for the settings marketplace
 *   POST /api/apify            → run the user's enabled actors, return jobs
 *
 * Actor runs go through `ApifySource`, so paid rows get the same geography
 * filter, remote-eligibility check, description sanitising and cross-source
 * dedupe as the free ones. A user running both Bayt actors gets one row per
 * job, not two.
 */

const MAX_LIMIT = 100;

/**
 * Vercel caps this function at 60s. Actors are given 40 of those.
 *
 * Cold starts are why this is not tighter: an actor that has not run recently
 * routinely spends 10-20 seconds booting before it fetches anything, and a
 * 20-second budget would mean paying for runs that never produce a row. They
 * all run concurrently, so the wall-clock cost is one actor, not the sum.
 */
const ACTOR_TIMEOUT_SECS = 40;
const PER_SOURCE_TIMEOUT_MS = 52_000;

function asCountries(input: unknown): Country[] {
    if (!Array.isArray(input)) return [];

    const display = (() => {
        try {
            return new Intl.DisplayNames(["en"], { type: "region" });
        } catch {
            return null;
        }
    })();

    return input
        .map((entry): Country | null => {
            if (typeof entry === "string") {
                const code = entry.toUpperCase();
                return { code, name: display?.of(code) ?? code };
            }
            if (entry && typeof entry === "object") {
                const code = String((entry as Country).code ?? "").toUpperCase();
                if (!code) return null;
                return { code, name: String((entry as Country).name ?? display?.of(code) ?? code) };
            }
            return null;
        })
        .filter((country): country is Country => country !== null);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!isAuthorized(req)) return reject(res);

    // ── The marketplace ───────────────────────────────────────
    if (req.method === "GET") {
        return res.status(200).json({
            defaults: defaultActorKeys(),
            actors: APIFY_ACTORS.map((actor) => ({
                key: actor.key,
                label: actor.label,
                summary: actor.summary,
                slug: actor.slug,
                url: `https://apify.com/${actor.slug}`,
                countries: actor.countries,
                language: actor.language,
                pricing: actor.pricing,
                /*
                 * Surfaced because it is the biggest quality difference between
                 * these actors and it is invisible from the name: four of the
                 * seven publish no description, so the scorer sees only a title.
                 */
                hasDescription: actor.hasDescription,
                enabledByDefault: actor.enabledByDefault,
            })),
        });
    }

    if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    // ── A run ─────────────────────────────────────────────────
    const body = (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body) ?? {};

    const token = String(body.apifyToken ?? "").trim();
    if (!token) {
        return res.status(400).json({ error: "`apifyToken` is required — this endpoint runs on the user's credit" });
    }

    const query = String(body.query ?? "").trim();
    if (!query) return res.status(400).json({ error: "`query` is required" });

    const request: SearchRequest = {
        query,
        countries: asCountries(body.countries),
        worldwide: Boolean(body.worldwide),
        workPreference: Array.isArray(body.workPreference) ? body.workPreference.map(String) : [],
        limit: Math.min(Number(body.limit) || 25, MAX_LIMIT),
        ats: {},
        maxAgeDays: Number(body.maxAgeDays) > 0 ? Number(body.maxAgeDays) : undefined,
        strictRemote: Boolean(body.strictRemote),
    };

    /*
     * The user's own selection, or the defaults. `selectActors` then drops the
     * ones that cannot serve this search at all — running a MENA-only actor for
     * a worldwide-remote search would bill the user to collect rows the
     * geography filter discards.
     */
    const requested = Array.isArray(body.actors) ? body.actors.map(String) : undefined;

    const probe: SearchRequest & { signal: AbortSignal } = { ...request, signal: AbortSignal.abort() };
    const actors = selectActors(requested, probe);

    if (actors.length === 0) {
        return res.status(200).json({
            jobs: [],
            meta: {
                total: 0,
                tookMs: 0,
                actors: [],
                note: "No enabled actor covers this search — nothing was run, and nothing was charged.",
            },
        });
    }

    const sources = actors.map((actor) => new ApifySource(actor, token, ACTOR_TIMEOUT_SECS));

    const started = Date.now();
    const { jobs, results } = await runSearch(request, sources, PER_SOURCE_TIMEOUT_MS);

    res.status(200).json({
        jobs,
        meta: {
            total: jobs.length,
            tookMs: Date.now() - started,
            query: request.query,
            countries: request.countries.map((country) => country.code),
            /*
             * Per-actor outcomes, because the user paid for each one
             * separately. `fetched` is what the actor returned and `count` is
             * what survived filtering — an actor billing for 50 rows that all
             * get discarded is a setting worth turning off, and this is where
             * that shows.
             */
            actors: results,
        },
    });
}
