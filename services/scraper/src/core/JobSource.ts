import type {
    CollectionStrategy,
    ScrapedJob,
    SearchContext,
    SourceDescriptor,
    SourceRun,
} from "./types.js";
import { annotateScope, passesGeography } from "../filters/geography.js";
import { withinMaxAge } from "../filters/freshness.js";
import { canonicalUrl, clean, isArabic, stripHtml, truncate } from "../lib/normalize.js";

/**
 * `jobs.description` is TEXT and the insert downstream is bulk, so the cap is
 * about keeping one verbose posting from bloating a whole batch, not about the
 * column.
 */
export const DESCRIPTION_MAX = 4000;

const JOB_TYPES = new Set<ScrapedJob["job_type"]>(["remote", "onsite", "hybrid"]);

/**
 * Everything every job source does, done once.
 *
 * The adapters this replaces each re-implemented the same six steps by hand —
 * fetch, map, drop the invalid rows, apply the query, apply geography, apply
 * the limit — and every one of them got a slightly different subset right. The
 * Wuzzuf adapter never applied the query at all; the LinkedIn one truncated
 * before deduping; two of them returned rows with HTML still in the
 * description, which is the thing that breaks the bulk insert.
 *
 * So the lifecycle lives here as a template method and a subclass supplies only
 * the two things that are genuinely per-source:
 *
 *   - `descriptor` — what the source is,
 *   - `toJob(raw)` — how one of its records becomes a listing,
 *
 * plus a `strategy` saying how records are obtained, which is almost always one
 * of the shared ones in `src/strategies`. A new board is a mapper and a few
 * lines of configuration.
 */
export abstract class JobSource<TRaw = unknown> {
    abstract readonly descriptor: SourceDescriptor;

    /** How raw records are obtained. The Strategy half of the design. */
    protected abstract readonly strategy: CollectionStrategy<TRaw>;

    /**
     * One raw record → one listing, or `null` to drop it.
     *
     * Return whatever the source gave you; `finalize` handles the cleaning,
     * truncation, URL canonicalisation and type checking, so a mapper never has
     * to remember to call `stripHtml` again.
     */
    protected abstract toJob(raw: TRaw, ctx: SearchContext): ScrapedJob | null;

    /**
     * Is this source worth calling for this search at all?
     *
     * Calling a remote-only board for an on-site search in Egypt wastes a
     * request and returns nothing usable, so those get skipped rather than
     * filtered after the fact. Override for anything with a stranger rule.
     */
    protected accepts(ctx: SearchContext): boolean {
        const { geo, countries } = this.descriptor;

        if (geo === "remote-only") {
            return (
                ctx.worldwide ||
                ctx.workPreference.length === 0 ||
                ctx.workPreference.includes("remote") ||
                ctx.workPreference.includes("hybrid")
            );
        }

        if (geo === "country") {
            /*
             * A worldwide search means "hires from anywhere", not "any country".
             * A board whose listings are on-site roles in Cairo has nothing to
             * offer that search, so it is skipped rather than called and then
             * filtered down to zero.
             */
            if (ctx.worldwide && ctx.countries.length === 0) return false;
            if (ctx.countries.length === 0) return true;
            return ctx.countries.some((country) => countries?.includes(country.code));
        }

        return true;
    }

    /**
     * Does this listing answer the query?
     *
     * Default is "yes" — a source that searched server-side has already
     * answered it. Feed-based sources override with `matchesQuery`, since none
     * of those APIs honour a search parameter.
     */
    protected isRelevant(_job: ScrapedJob, _ctx: SearchContext): boolean {
        return true;
    }

    /**
     * The contract, enforced in one place.
     *
     * Every field that reaches a typed column is normalised here: HTML out of
     * the text, tracking out of the URL, an out-of-range `job_type` folded to a
     * legal one. A row that cannot satisfy the contract is dropped rather than
     * repaired into a lie.
     */
    protected finalize(job: ScrapedJob): ScrapedJob | null {
        const title = clean(job.title);
        const apply_url = canonicalUrl(job.apply_url);
        if (!title || !apply_url) return null;

        const description = truncate(stripHtml(job.description), DESCRIPTION_MAX);
        const location = clean(job.location);

        return {
            ...job,
            title,
            company: clean(job.company) || "Unknown",
            location,
            job_type: JOB_TYPES.has(job.job_type) ? job.job_type : "onsite",
            description,
            apply_url,
            salary_text: clean(job.salary_text) || null,
            source_key: this.descriptor.key,
            external_id: clean(job.external_id) || apply_url,
            language: isArabic(`${title} ${description}`) ? "ar" : this.descriptor.language,
        };
    }

    /**
     * Collect, map, filter, report — and never throw.
     *
     * One board being slow, rate-limited or newly Cloudflare-protected costs
     * its own results and nothing else. A run that loses Wuzzuf still returns
     * the other nine sources rather than failing.
     */
    async run(ctx: SearchContext): Promise<SourceRun> {
        const started = Date.now();
        const source = this.descriptor.key;

        if (!this.accepts(ctx)) {
            return {
                jobs: [],
                result: { source, ok: true, count: 0, ms: 0, error: "skipped — not relevant to this search" },
            };
        }

        try {
            const raw = await this.strategy.collect(ctx);
            const jobs: ScrapedJob[] = [];
            const seen = new Set<string>();

            for (const record of raw) {
                if (jobs.length >= ctx.limit) break;

                let mapped: ScrapedJob | null;
                try {
                    mapped = this.toJob(record, ctx);
                } catch {
                    // A single unmappable record is this row's problem, not the
                    // source's. Boards do ship the occasional malformed entry.
                    continue;
                }
                if (!mapped) continue;

                const job = this.finalize(mapped);
                if (!job || seen.has(job.apply_url)) continue;

                if (!this.isRelevant(job, ctx)) continue;
                if (!withinMaxAge(job, ctx)) continue;
                if (!passesGeography(job, ctx, ctx.strictRemote)) continue;

                seen.add(job.apply_url);
                jobs.push(annotateScope(job));
            }

            const notes = this.strategy.notes?.() ?? [];

            return {
                jobs,
                result: {
                    source,
                    ok: true,
                    count: jobs.length,
                    fetched: raw.length,
                    ms: Date.now() - started,
                    // Succeeded, but not completely. Reported rather than
                    // swallowed so a stale slug or a flaky host is visible in
                    // `meta.sources` instead of looking like an empty market.
                    error: notes.length ? `partial — ${notes.join("; ")}` : undefined,
                },
            };
        } catch (error) {
            return {
                jobs: [],
                result: {
                    source,
                    ok: false,
                    count: 0,
                    ms: Date.now() - started,
                    error: error instanceof Error ? error.message : String(error),
                },
            };
        }
    }
}
