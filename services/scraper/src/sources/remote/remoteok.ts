import { JobSource } from "../../core/JobSource.js";
import type { ScrapedJob, SearchContext, SourceDescriptor } from "../../core/types.js";
import { JsonFeedStrategy } from "../../strategies/JsonFeedStrategy.js";
import { matchesQuery } from "../../filters/relevance.js";
import { clean, pick, toTimestamp } from "../../lib/normalize.js";

type Row = Record<string, unknown>;

export class RemoteOkSource extends JobSource<Row> {
    readonly descriptor: SourceDescriptor = {
        key: "remoteok",
        label: "RemoteOK",
        kind: "api",
        geo: "remote-only",
        language: "en",
        enabledByDefault: true,
        note: "Public JSON feed, ~100 latest. The first element is a legal notice, not a job.",
    };

    protected readonly strategy = new JsonFeedStrategy<Row>({
        url: () => "https://remoteok.com/api",
        extract: (payload) =>
            (payload as Row[]).filter((row) => row && row.id && row.position),
    });

    protected isRelevant(job: ScrapedJob, ctx: SearchContext): boolean {
        return matchesQuery(ctx.query, job.title, job.description);
    }

    protected toJob(row: Row): ScrapedJob {
        return {
            title: clean(row.position),
            company: clean(row.company),
            location: clean(row.location) || "Remote",
            job_type: "remote",
            description: String(row.description ?? ""),
            apply_url: clean(pick(row, ["url", "apply_url"], "")),
            salary_text: Number(row.salary_min) > 0 ? `${row.salary_min} - ${row.salary_max}` : null,
            posted_at_source: toTimestamp(pick(row, ["date", "epoch"], null)),
            source_key: this.descriptor.key,
            external_id: String(row.id),
        };
    }
}
