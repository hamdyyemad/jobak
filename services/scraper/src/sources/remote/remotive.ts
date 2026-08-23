import { JobSource } from "../../core/JobSource.js";
import type { ScrapedJob, SearchContext, SourceDescriptor } from "../../core/types.js";
import { RssFeedStrategy, type RssItem } from "../../strategies/RssFeedStrategy.js";
import { matchesQuery } from "../../filters/relevance.js";
import { clean, toTimestamp } from "../../lib/normalize.js";

/**
 * Remotive, via its RSS feed rather than its JSON API.
 *
 * **The API was off-limits and we were using it.** `remotive.com/robots.txt`
 * carries `Disallow: /api/*`, and this source fetched `/api/remote-jobs` on
 * every run. Nobody noticed because nothing checked — the compliance section in
 * the README was hand-audited once and this host was read as "fine". Turning on
 * the robots parser in `lib/http.ts` surfaced it immediately, which is the
 * whole argument for enforcing rules instead of documenting them.
 *
 * `/remote-jobs/feed` is not disallowed, and it turns out to be the better
 * source anyway: the API returned one flat JSON blob, while the feed publishes
 * `<company>`, `<location>`, `<type>` and `<jobId>` as their own elements
 * alongside a full HTML description that survives the sanitiser with its
 * structure intact.
 *
 * The trade is size — the feed carries the 20 most recent postings where the
 * API returned the lot. For a collector that runs hourly against "what is new",
 * that is close to the same thing.
 */
export class RemotiveSource extends JobSource<RssItem> {
    readonly descriptor: SourceDescriptor = {
        key: "remotive",
        label: "Remotive",
        kind: "rss",
        geo: "remote-only",
        language: "en",
        enabledByDefault: true,
        note: "RSS. The JSON API is `Disallow: /api/*` in their robots.txt — do not go back to it.",
    };

    protected readonly strategy = new RssFeedStrategy({
        url: () => "https://remotive.com/remote-jobs/feed",
    });

    protected isRelevant(job: ScrapedJob, ctx: SearchContext): boolean {
        return matchesQuery(ctx.query, job.title, job.description);
    }

    protected toJob(item: RssItem): ScrapedJob | null {
        const link = item.link ?? item.guid ?? "";
        if (!item.title || !link) return null;

        return {
            title: item.title,
            company: item.company || item["dc:creator"] || "Unknown",
            /*
             * Remotive states the hiring window rather than the employer's
             * address — "USA", "Anywhere", "Europe" — which is exactly what the
             * eligibility filter needs and what most feeds refuse to give.
             */
            location: item.location || "Remote",
            job_type: "remote",
            description: item.description ?? "",
            apply_url: link,
            salary_text: null,
            posted_at_source: toTimestamp(item.pubdate ?? null),
            source_key: this.descriptor.key,
            external_id: clean(item.jobid) || link,
        };
    }
}
