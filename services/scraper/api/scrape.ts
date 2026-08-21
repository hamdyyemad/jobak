import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAuthorized, reject } from "../src/auth.js";
import { DEFAULT_SOURCES, runSources, sourceByKey } from "../src/sources/index.js";
import type { Country, ScrapeParams } from "../src/types.js";

/**
 * Vercel caps a function at 60s on Hobby. Each source gets well under that so
 * the aggregate still returns even when several are slow, and the response is
 * never lost to a platform timeout.
 */
const PER_SOURCE_TIMEOUT_MS = 12_000;
const MAX_LIMIT = 100;

function asCountries(input: unknown): Country[] {
    if (!Array.isArray(input)) return [];
    const display = (() => {
        try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch { return null; }
    })();

    return input
        .map((entry) => {
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
        .filter((c): c is Country => Boolean(c));
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

    const params: ScrapeParams = {
        query,
        countries: asCountries(body.countries),
        worldwide: Boolean(body.worldwide),
        workPreference: Array.isArray(body.workPreference) ? body.workPreference.map(String) : [],
        limit: Math.min(Number(body.limit) || 25, MAX_LIMIT),
        ats: body.ats && typeof body.ats === "object" ? body.ats : undefined,
    };

    const requested: string[] = Array.isArray(body.sources) && body.sources.length
        ? body.sources.map(String).filter((k: string) => sourceByKey.has(k))
        : DEFAULT_SOURCES;

    if (requested.length === 0) {
        return res.status(400).json({ error: "No known sources requested" });
    }

    const started = Date.now();
    const { jobs, results } = await runSources(params, requested, PER_SOURCE_TIMEOUT_MS);

    res.status(200).json({
        jobs,
        meta: {
            total: jobs.length,
            tookMs: Date.now() - started,
            query: params.query,
            countries: params.countries.map((c) => c.code),
            worldwide: params.worldwide,
            sources: results,
        },
    });
}
