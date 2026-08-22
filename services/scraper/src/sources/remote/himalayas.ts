import { JobSource } from "../../core/JobSource.js";
import type { ScrapedJob, SearchContext, SourceDescriptor } from "../../core/types.js";
import { JsonFeedStrategy } from "../../strategies/JsonFeedStrategy.js";
import { matchesQuery } from "../../filters/relevance.js";
import { clean, pick, toTimestamp } from "../../lib/normalize.js";

type Row = Record<string, unknown>;

export class HimalayasSource extends JobSource<Row> {
    readonly descriptor: SourceDescriptor = {
        key: "himalayas",
        label: "Himalayas",
        kind: "api",
        geo: "remote-only",
        language: "en",
        enabledByDefault: true,
        note: "Small, fast-rotating feed. `locationRestrictions` is a real hiring window — trust it.",
    };

    protected readonly strategy = new JsonFeedStrategy<Row>({
        url: (ctx) => `https://himalayas.app/jobs/api?limit=${Math.min(ctx.limit * 4, 100)}`,
        extract: (payload) => (payload as { jobs?: Row[] }).jobs ?? [],
    });

    protected isRelevant(job: ScrapedJob, ctx: SearchContext): boolean {
        return matchesQuery(ctx.query, job.title, job.description);
    }

    protected toJob(row: Row): ScrapedJob {
        /*
         * The one feed that states its restrictions as a list. An empty list is
         * Himalayas' own convention for unrestricted, so it maps straight onto a
         * worldwide scope rather than an unknown one.
         */
        const restrictions = Array.isArray(row.locationRestrictions)
            ? (row.locationRestrictions as unknown[]).map(String).join(", ")
            : "";

        return {
            title: clean(row.title),
            company: clean(row.companyName),
            location: restrictions || "Anywhere",
            job_type: "remote",
            description: String(pick(row, ["description", "excerpt"], "")),
            apply_url: clean(pick(row, ["applicationLink", "guid"], "")),
            salary_text:
                Number(row.minSalary) > 0
                    ? `${row.minSalary}-${row.maxSalary} ${clean(row.currency)} ${clean(row.salaryPeriod)}`.trim()
                    : null,
            posted_at_source: toTimestamp(row.pubDate),
            source_key: this.descriptor.key,
            external_id: clean(pick(row, ["guid", "applicationLink"], "")),
        };
    }
}
