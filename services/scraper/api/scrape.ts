import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAuthorized, reject } from "../src/auth.js";
import { runSearch } from "../src/core/pipeline.js";
import { registry } from "../src/sources/index.js";
import type { Country, SearchRequest } from "../src/core/types.js";

/**
 * Vercel caps a function at 60s on Hobby. Each source gets well under that so
 * the aggregate still returns even when several are slow, and the response is
 * never lost to a platform timeout.
 *
 * Raised from 12s with the detail-page sources: Wuzzuf and Bayt fan out to
 * several pages behind one source slot, and 12s was cutting their fan-out off
 * mid-budget. They all still run concurrently, so the wall-clock cost of the
 * whole run is one source, not the sum.
 */
const PER_SOURCE_TIMEOUT_MS = 18_000;
const MAX_LIMIT = 100;

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
            // Accepts either "EG" or { code, name }, so the caller can send
            // whatever it already has without a translation step.
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

function asAts(input: unknown): Record<string, string[]> {
    if (!input || typeof input !== "object") return {};

    const out: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
        if (Array.isArray(value)) {
            out[key] = value.map(String).filter(Boolean);
        }
    }
    return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }
    if (!isAuthorized(req)) return reject(res);

    const body = (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body) ?? {};

    const query = String(body.query ?? "").trim();
    if (!query) return res.status(400).json({ error: "`query` is required" });

    const request: SearchRequest = {
        query,
        countries: asCountries(body.countries),
        worldwide: Boolean(body.worldwide),
        workPreference: Array.isArray(body.workPreference) ? body.workPreference.map(String) : [],
        limit: Math.min(Number(body.limit) || 25, MAX_LIMIT),
        ats: asAts(body.ats),
        // `maxAgeDays: 1` is "posted today" — what the scheduled collectors ask
        // for, so a run that repeats hourly is not re-reading the same archive.
        maxAgeDays: Number(body.maxAgeDays) > 0 ? Number(body.maxAgeDays) : undefined,
        strictRemote: Boolean(body.strictRemote),
    };

    const requested = Array.isArray(body.sources) ? body.sources.map(String) : undefined;
    const sources = registry.selectFor(requested);

    if (sources.length === 0) {
        return res.status(400).json({ error: "No known sources requested" });
    }

    const started = Date.now();
    const { jobs, results } = await runSearch(request, sources, PER_SOURCE_TIMEOUT_MS);

    res.status(200).json({
        jobs,
        meta: {
            total: jobs.length,
            tookMs: Date.now() - started,
            query: request.query,
            countries: request.countries.map((country) => country.code),
            worldwide: request.worldwide,
            strictRemote: request.strictRemote ?? false,
            sources: results,
        },
    });
}
