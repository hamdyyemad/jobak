import { JobSource } from "../../core/JobSource.js";
import type { ScrapedJob, SearchContext, SourceDescriptor } from "../../core/types.js";
import { JsonFeedStrategy } from "../../strategies/JsonFeedStrategy.js";
import { matchesQuery } from "../../filters/relevance.js";
import { clean, toTimestamp } from "../../lib/normalize.js";

type Row = Record<string, unknown>;

export class RemotiveSource extends JobSource<Row> {
    readonly descriptor: SourceDescriptor = {
        key: "remotive",
        label: "Remotive",
        kind: "api",
        geo: "remote-only",
        language: "en",
        enabledByDefault: true,
        note: "`?search=` and `?limit=` are accepted and ignored; the endpoint returns the whole feed.",
    };

    protected readonly strategy = new JsonFeedStrategy<Row>({
        url: () => "https://remotive.com/api/remote-jobs",
        extract: (payload) => (payload as { jobs?: Row[] }).jobs ?? [],
    });

    protected isRelevant(job: ScrapedJob, ctx: SearchContext): boolean {
        return matchesQuery(ctx.query, job.title, job.description);
    }

    protected toJob(row: Row): ScrapedJob {
        return {
            title: clean(row.title),
            company: clean(row.company_name),
            /*
             * `candidate_required_location` is the field the eligibility filter
             * needs — Remotive is one of the few feeds that states the hiring
             * window rather than the employer's address.
             */
            location: clean(row.candidate_required_location) || "Remote",
            job_type: "remote",
            description: String(row.description ?? ""),
            apply_url: clean(row.url),
            salary_text: clean(row.salary) || null,
            posted_at_source: toTimestamp(row.publication_date),
            source_key: this.descriptor.key,
            external_id: String(row.id),
        };
    }
}
