import { JobSource } from "../../core/JobSource.js";
import type { ScrapedJob, SearchContext, SourceDescriptor } from "../../core/types.js";
import { RssFeedStrategy, type RssItem } from "../../strategies/RssFeedStrategy.js";
import { matchesQuery } from "../../filters/relevance.js";
import { toTimestamp } from "../../lib/normalize.js";

export class WeWorkRemotelySource extends JobSource<RssItem> {
    readonly descriptor: SourceDescriptor = {
        key: "weworkremotely",
        label: "We Work Remotely",
        kind: "rss",
        geo: "remote-only",
        language: "en",
        enabledByDefault: true,
        note: "RSS. Company and title share one title element, separated by a colon.",
    };

    protected readonly strategy = new RssFeedStrategy({
        url: () => "https://weworkremotely.com/remote-jobs.rss",
    });

    protected isRelevant(job: ScrapedJob, ctx: SearchContext): boolean {
        return matchesQuery(ctx.query, job.title, job.description);
    }

    protected toJob(item: RssItem): ScrapedJob | null {
        const raw = item.title ?? "";
        const link = item.link ?? "";
        if (!raw || !link) return null;

        // Formatted as "Company Name: Senior Backend Engineer".
        const split = raw.indexOf(":");
        const company = split > 0 ? raw.slice(0, split).trim() : "Unknown";
        const title = split > 0 ? raw.slice(split + 1).trim() : raw;

        return {
            title,
            company,
            // `region` is WWR's own hiring-window field, and it is the reason
            // this feed survives the eligibility filter as well as it does.
            location: item.region || "Anywhere",
            job_type: "remote",
            description: item.description ?? "",
            apply_url: link,
            salary_text: null,
            posted_at_source: toTimestamp(item.pubdate ?? null),
            source_key: this.descriptor.key,
            external_id: link,
        };
    }
}
