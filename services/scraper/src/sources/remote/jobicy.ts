import { JobSource } from "../../core/JobSource.js";
import type { ScrapedJob, SearchContext, SourceDescriptor } from "../../core/types.js";
import { JsonFeedStrategy } from "../../strategies/JsonFeedStrategy.js";
import { matchesQuery } from "../../filters/relevance.js";
import { clean, pick, toTimestamp } from "../../lib/normalize.js";

type Row = Record<string, unknown>;

export class JobicySource extends JobSource<Row> {
    readonly descriptor: SourceDescriptor = {
        key: "jobicy",
        label: "Jobicy",
        kind: "api",
        geo: "remote-only",
        language: "en",
        enabledByDefault: true,
        note: "`?count=` is honoured; `?tag=` is not.",
    };

    protected readonly strategy = new JsonFeedStrategy<Row>({
        url: (ctx) => `https://jobicy.com/api/v2/remote-jobs?count=${Math.min(ctx.limit * 4, 100)}`,
        extract: (payload) => (payload as { jobs?: Row[] }).jobs ?? [],
    });

    protected isRelevant(job: ScrapedJob, ctx: SearchContext): boolean {
        return matchesQuery(ctx.query, job.title, job.description);
    }

    protected toJob(row: Row): ScrapedJob {
        return {
            title: clean(row.jobTitle),
            company: clean(row.companyName),
            location: clean(row.jobGeo) || "Anywhere",
            job_type: "remote",
            description: String(pick(row, ["jobDescription", "jobExcerpt"], "")),
            apply_url: clean(row.url),
            salary_text:
                Number(row.salaryMin) > 0
                    ? `${row.salaryMin}-${row.salaryMax} ${clean(row.salaryCurrency)} ${clean(row.salaryPeriod)}`.trim()
                    : null,
            posted_at_source: toTimestamp(row.pubDate),
            source_key: this.descriptor.key,
            external_id: String(row.id),
        };
    }
}
