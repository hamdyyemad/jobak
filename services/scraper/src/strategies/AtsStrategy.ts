import type { CollectionStrategy, SearchContext, SourceKind } from "../core/types.js";
import { fetchJson, mapLimit } from "../lib/http.js";

/** A row, carrying the company slug it came from — ATS payloads rarely name the company. */
export interface AtsRow {
    slug: string;
    row: Record<string, unknown>;
}

export interface AtsConfig {
    /** Which key of `ctx.ats` holds this system's company slugs. */
    atsKey: string;
    url(slug: string): string;
    extract(payload: unknown): Record<string, unknown>[];
    headers?: Record<string, string>;
}

/**
 * Applicant tracking systems, per company.
 *
 * Greenhouse, Ashby and Workable publish every open role at a company as JSON
 * so the company can embed its own board. These are the highest-quality
 * listings available anywhere — full descriptions, first-party, always current,
 * and the apply URL *is* the company's own — and completely free.
 *
 * The catch is that you have to know which companies to ask, so the caller
 * supplies slugs. A slug that fails costs its own company and nothing else.
 */
export class AtsStrategy implements CollectionStrategy<AtsRow> {
    readonly kind: SourceKind = "ats";

    /**
     * Slugs that failed on the last run.
     *
     * These have to be reported, because an ATS answers "this company has
     * nothing open" and "we could not reach this company" with the same empty
     * array otherwise — and a slug list is a hand-maintained thing that goes
     * stale, so "which of my slugs are dead" needs an answer that is not
     * "read the logs". Greenhouse in particular has answered the same request
     * in 234ms and in 9.8s minutes apart, so timeouts here are ordinary.
     */
    private failures: string[] = [];

    constructor(private readonly config: AtsConfig) {}

    notes(): string[] {
        return this.failures;
    }

    async collect(ctx: SearchContext): Promise<AtsRow[]> {
        const slugs = ctx.ats[this.config.atsKey] ?? [];
        this.failures = [];
        if (slugs.length === 0) return [];

        const perCompany = await mapLimit(slugs, 4, async (slug): Promise<AtsRow[]> => {
            try {
                const payload = await fetchJson<unknown>(this.config.url(slug), ctx.signal, {
                    headers: this.config.headers,
                    timeoutMs: 12_000,
                });
                return this.config.extract(payload).map((row) => ({ slug, row }));
            } catch (error) {
                this.failures.push(`${slug}: ${error instanceof Error ? error.message : String(error)}`);
                return [];
            }
        });

        /*
         * Every company failing is not a slug problem, it is the ATS being down
         * or the whole list being wrong — and that deserves to fail the source
         * rather than report a confident zero.
         */
        if (this.failures.length === slugs.length) {
            throw new Error(`all ${slugs.length} companies failed — ${this.failures[0]}`);
        }

        return perCompany.flat();
    }
}
