import { JobSource } from "../../core/JobSource.js";
import type { ScrapedJob, SearchContext, SourceDescriptor } from "../../core/types.js";
import { JsonFeedStrategy } from "../../strategies/JsonFeedStrategy.js";
import { matchesQuery } from "../../filters/relevance.js";
import { clean, inferJobType, toTimestamp } from "../../lib/normalize.js";

type Row = Record<string, unknown>;
type Payload = { data?: Row[]; links?: { next?: string | null } };

/**
 * Arbeitnow — a German board, and the origin of most of the `Remote
 * Deutschland` rows that made a Cairo search look like a Berlin one.
 *
 * Kept, because the eligibility filter now handles exactly that problem and the
 * feed does carry genuinely worldwide remote roles underneath the German ones.
 * But gated: it is only worth a request when the search would take a remote
 * role, since its on-site listings can never be relevant to this product.
 */
export class ArbeitnowSource extends JobSource<Row> {
    readonly descriptor: SourceDescriptor = {
        key: "arbeitnow",
        label: "Arbeitnow",
        kind: "api",
        geo: "company",
        language: "en",
        enabledByDefault: true,
        note: "Europe-weighted; only called for remote-leaning searches. Descriptions arrive double HTML-encoded.",
    };

    protected readonly strategy = new JsonFeedStrategy<Row>({
        url: () => "https://www.arbeitnow.com/api/job-board-api",
        extract: (payload) => (payload as Payload).data ?? [],
        nextUrl: (payload) => (payload as Payload).links?.next ?? null,
        // Two pages is ~350 postings — plenty against a per-source limit, and it
        // keeps the run inside its timeout budget.
        maxPages: 2,
    });

    /**
     * The gate. A Europe-weighted general board has nothing to offer a MENA
     * on-site search, and calling it anyway costs a request and returns rows
     * the geography filter then discards one by one.
     */
    protected accepts(ctx: SearchContext): boolean {
        return (
            ctx.worldwide ||
            ctx.workPreference.length === 0 ||
            ctx.workPreference.includes("remote") ||
            ctx.workPreference.includes("hybrid")
        );
    }

    protected isRelevant(job: ScrapedJob, ctx: SearchContext): boolean {
        return matchesQuery(ctx.query, job.title, job.description);
    }

    protected toJob(row: Row): ScrapedJob {
        const remote = row.remote === true;

        return {
            title: clean(row.title),
            company: clean(row.company_name),
            /*
             * Keeping the location on a remote row is what lets the eligibility
             * filter tell "remote, Düsseldorf" from "remote, anywhere". The old
             * adapter overwrote it with the word "Remote", which erased the only
             * signal that would have caught these.
             */
            location: clean(row.location) || (remote ? "Remote" : "Not specified"),
            job_type: remote ? "remote" : inferJobType(row.title, row.location, row.job_types),
            description: String(row.description ?? ""),
            apply_url: clean(row.url),
            salary_text: null,
            posted_at_source: toTimestamp(row.created_at),
            source_key: this.descriptor.key,
            external_id: clean(row.slug),
        };
    }
}
