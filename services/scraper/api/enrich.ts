import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAuthorized, reject } from "../src/auth.js";
import { enrichCompany, type CompanyHints, type CompanyProfile } from "../src/enrichment/company.js";
import { freeResolvers } from "../src/enrichment/resolve.js";
import { Budget, mapLimit } from "../src/lib/http.js";

/**
 * Company enrichment, deliberately separate from `/api/scrape`.
 *
 * Resolving one company costs up to three outbound requests, and a scrape can
 * return jobs from sixty of them — enough to blow the function budget several
 * times over if it were inline. Separating it also matches how the answer
 * behaves: a company's website and LinkedIn page change roughly never, while
 * its open roles change hourly. So n8n calls this after inserting jobs, caches
 * the result in `companies`, and never asks twice for the same company.
 *
 * Everything here degrades rather than fails. A company that cannot be resolved
 * comes back with nulls and `resolvedVia: "none"`, which is a usable answer —
 * the caller shows the aggregator's apply link, exactly as it does today.
 */
const MAX_COMPANIES = 40;
const BUDGET_MS = 45_000;
const CONCURRENCY = 6;

function asHints(input: unknown): CompanyHints[] {
    if (!Array.isArray(input)) return [];

    return input
        .map((entry): CompanyHints | null => {
            if (typeof entry === "string") return entry.trim() ? { name: entry.trim() } : null;
            if (!entry || typeof entry !== "object") return null;

            const record = entry as Record<string, unknown>;
            const name = String(record.name ?? "").trim();
            if (!name) return null;

            return {
                name,
                website: record.website ? String(record.website) : null,
                linkedin: record.linkedin ? String(record.linkedin) : null,
                applyUrl: record.applyUrl ? String(record.applyUrl) : null,
            };
        })
        .filter((hint): hint is CompanyHints => hint !== null)
        .slice(0, MAX_COMPANIES);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }
    if (!isAuthorized(req)) return reject(res);

    const body = (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body) ?? {};
    const hints = asHints(body.companies);

    if (hints.length === 0) {
        return res.status(400).json({ error: "`companies` must be a non-empty array" });
    }

    /*
     * Resolution costs nothing but time, so it is on unless a caller opts out.
     * The domain guesser is the slow half — up to 33 requests for a company
     * that never resolves — and an interactive call may prefer to answer with
     * only what the sources already knew.
     */
    const resolvers = body.resolve === false ? [] : freeResolvers();

    const budget = new Budget(BUDGET_MS);
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BUDGET_MS);

    try {
        const companies = await mapLimit(hints, CONCURRENCY, async (hint): Promise<CompanyProfile> => {
            if (budget.expired) {
                // Out of time: answer with what was already known rather than
                // dropping the row, so the caller can cache the partial result
                // and the next run has less to do.
                return {
                    name: hint.name,
                    website: hint.website ?? null,
                    linkedin: hint.linkedin ?? null,
                    careers: null,
                    resolvedVia: hint.website ? "source" : "none",
                };
            }

            try {
                return await enrichCompany(hint, controller.signal, resolvers);
            } catch {
                return {
                    name: hint.name,
                    website: null,
                    linkedin: null,
                    careers: null,
                    resolvedVia: "none",
                };
            }
        });

        res.status(200).json({
            companies,
            meta: {
                total: companies.length,
                resolved: companies.filter((company) => company.website !== null).length,
                withLinkedin: companies.filter((company) => company.linkedin !== null).length,
                withCareers: companies.filter((company) => company.careers !== null).length,
                resolversEnabled: resolvers.map((resolver) => resolver.name),
                tookMs: Date.now() - started,
            },
        });
    } finally {
        clearTimeout(timer);
    }
}
