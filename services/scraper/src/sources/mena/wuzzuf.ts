import { JobSource } from "../../core/JobSource.js";
import type { ScrapedJob, SearchContext, SourceDescriptor } from "../../core/types.js";
import { DetailPageStrategy } from "../../strategies/DetailPageStrategy.js";
import { matchesQuery } from "../../filters/relevance.js";
import { collectSitemapUrls } from "../../lib/sitemap.js";
import { clean, foldForMatch, inferJobType, pick, toTimestamp } from "../../lib/normalize.js";

/**
 * Wuzzuf — the largest professional board in Egypt, and now Saudi and the UAE.
 *
 * Two things about this source are worth knowing before changing it.
 *
 * **The search pages are useless to us.** `/search/jobs/` is Cloudflare-gated,
 * and the `/a/{Query}-Jobs-in-{Country}` route that the previous adapter parsed
 * has since become a client-rendered shell: it answers a plain HTTP client with
 * its templates unfilled — a literal `<title>{{keyword}} jobs in
 * {{locationName}}</title>` — and contains exactly one job link. That adapter
 * was returning almost nothing long before anyone noticed, which is most of
 * why a search from Cairo came back full of European remote roles.
 *
 * **The detail pages are a gift.** Each one inlines the site's whole Redux
 * store as `Wuzzuf.initialStoreState`, normalised JSON:API style. That gives
 * fully structured jobs — workplace arrangement, city, country code, salary
 * bounds, posting date, Arabic translations — and, in the linked `company`
 * entity, the company's own `website` and `linkedinProfile`. Those two fields
 * are what every other source needs a three-request crawl to discover.
 *
 * Discovery is the sitemap, because it is the one listing surface Wuzzuf still
 * renders server-side: ~5,600 job URLs in a single request, each slug carrying
 * the title, company and country in plain text, which is enough to narrow to
 * the search before spending a request on a page.
 */

/**
 * The index, not the individual files.
 *
 * This used to name `sitemap-job-1.xml` and `sitemap-saudi-job-1.xml`
 * directly. The `-1` is Wuzzuf saying it intends to shard, and the day it adds
 * a `-2` those names keep working while quietly returning half the market — an
 * outage with no error attached. Descending the index means new shards are
 * picked up on their own.
 */
const SITEMAP_INDEX = "https://wuzzuf.net/sitemap.xml";

/** The job shards, out of an index that also lists companies, learning and static pages. */
const JOB_SITEMAP = /sitemap-(?:[a-z-]+-)?job-\d+\.xml/i;

interface WuzzufRecord {
    attributes: Record<string, unknown>;
    company: Record<string, unknown> | null;
}

export class WuzzufSource extends JobSource<WuzzufRecord> {
    readonly descriptor: SourceDescriptor = {
        key: "wuzzuf",
        label: "Wuzzuf",
        kind: "detail",
        geo: "country",
        countries: ["EG", "SA", "AE"],
        language: "en",
        enabledByDefault: true,
        note: "Egypt, Saudi and UAE. Sitemap discovery into detail pages; carries company website and LinkedIn.",
    };

    protected readonly strategy = new DetailPageStrategy<WuzzufRecord>({
        discover: (ctx) => this.discover(ctx),
        parse: (html) => parseStore(html),
        // A page yields ~17 records, so far fewer fetches are needed per listing.
        overFetch: 0.3,
        concurrency: 5,
        budgetMs: 9_000,
    });

    /**
     * The sitemap, narrowed by slug.
     *
     * A slug reads `jaxpwjzjxk3j-senior-backend-developer-k-line-europe-cairo-egypt`
     * — id, title, company, city, country — so both filters this needs are
     * answerable without fetching anything. Ranking by how many query words a
     * slug contains puts the pages most likely to answer the search at the
     * front, which matters because the budget will not reach the back.
     */
    private async discover(ctx: SearchContext): Promise<string[]> {
        const wanted = ctx.countries.length
            ? ctx.countries.filter((country) => this.descriptor.countries?.includes(country.code))
            : [{ code: "EG", name: "Egypt" }];

        const suffixes = wanted.map((country) => `-${slugify(country.name)}`);
        const terms = foldForMatch(ctx.query).split(/\s+/).filter((word) => word.length > 2);

        const urls = await collectSitemapUrls(SITEMAP_INDEX, ctx.signal, {
            accept: (url) => JOB_SITEMAP.test(url),
            // Egypt and Saudi are two files today; the ceiling is headroom for
            // sharding, not an expectation.
            maxFiles: 6,
            timeoutMs: 8_000,
        });

        const scored: { url: string; score: number }[] = [];

        for (const url of urls) {
            const slug = decodeURIComponent(url).toLowerCase();

            if (!suffixes.some((suffix) => slug.endsWith(suffix))) continue;

            const score = terms.filter((term) => slug.includes(term)).length;
            /*
             * A slug matching no query word at all is still worth keeping when
             * nothing matched: a page carries its related postings too, so even
             * an off-target fetch usually returns something the query filter
             * can use.
             */
            scored.push({ url, score });
        }

        const hits = scored.filter((entry) => entry.score > 0);
        const pool = hits.length > 0 ? hits : scored;

        return pool.sort((a, b) => b.score - a.score).map((entry) => entry.url);
    }

    protected isRelevant(job: ScrapedJob, ctx: SearchContext): boolean {
        return matchesQuery(ctx.query, job.title, job.description);
    }

    protected toJob({ attributes, company }: WuzzufRecord, _ctx: SearchContext): ScrapedJob | null {
        if (clean(attributes.status) !== "active") return null;

        const uri = clean(attributes.uri);
        if (!uri) return null;

        const location = attributes.location as Record<string, unknown> | undefined;
        const city = clean(pick(location ?? {}, ["city.name"], ""));
        const country = clean(pick(location ?? {}, ["country.name"], ""));

        const arrangement = clean(pick(attributes, ["workplaceArrangement.displayedName"], ""));

        /*
         * Wuzzuf splits the posting across two HTML fields and shows both on the
         * page. Joining them is what gives the scorer downstream something to
         * work with — the previous adapter had no description at all and fed it
         * a list of skill chips.
         */
        const description = [attributes.description, attributes.requirements]
            .map((part) => String(part ?? ""))
            .filter(Boolean)
            .join(" ");

        return {
            title: clean(attributes.title),
            // `hideCompany` is Wuzzuf's confidential-posting flag; the company
            // entity is still present but naming it would break the promise.
            company: attributes.hideCompany === true ? "Confidential" : clean(company?.name) || "Confidential",
            location: [city, country].filter(Boolean).join(", "),
            job_type: inferJobType(arrangement),
            description,
            apply_url: `https://wuzzuf.net/${uri.replace(/^\/+/, "")}`,
            salary_text: attributes.hideSalary === true ? null : salaryText(attributes.salary),
            // "07/03/2026 15:00:53" — month first, as `createdAt: 06/26/2012`
            // on the company entity proves.
            posted_at_source: toTimestamp(clean(attributes.postedAt)),
            source_key: this.descriptor.key,
            external_id: clean(attributes.slug) || uri,
            company_links: company
                ? {
                      website: normalizeWebsite(company.website),
                      linkedin: clean(company.linkedinProfile) || null,
                      careers: null,
                  }
                : undefined,
        };
    }
}

/**
 * Pulls the inlined Redux store out of a detail page.
 *
 * Brace-matched rather than regexed to the closing brace: the payload is ~320KB
 * of JSON containing every brace character you can imagine inside strings, and
 * a non-greedy `\{[\s\S]*?\}` truncates it at the first nested object.
 */
function parseStore(html: string): WuzzufRecord[] {
    const marker = html.match(/Wuzzuf\.initialStoreState\s*=\s*/);
    if (!marker || marker.index === undefined) return [];

    const json = braceMatched(html, marker.index + marker[0].length);
    if (!json) return [];

    let store: unknown;
    try {
        store = JSON.parse(json);
    } catch {
        return [];
    }

    const entities = pick<Record<string, unknown>>(store, ["entities"], {});
    const jobs = pick<Record<string, Record<string, unknown>>>(entities, ["job.collection"], {});
    const companies = pick<Record<string, Record<string, unknown>>>(entities, ["company.collection"], {});

    return Object.values(jobs).flatMap((entity) => {
        const attributes = entity.attributes as Record<string, unknown> | undefined;
        if (!attributes) return [];

        // JSON:API normalisation — the company lives in its own collection and
        // the job only holds a pointer to it.
        const companyId = clean(pick(entity, ["relationships.company.data.id"], ""));
        const company = (companies[companyId]?.attributes as Record<string, unknown> | undefined) ?? null;

        return [{ attributes, company }];
    });
}

/** Reads one balanced `{…}` starting at `from`, ignoring braces inside strings. */
function braceMatched(text: string, from: number): string | null {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = from; i < text.length; i++) {
        const char = text[i];

        if (inString) {
            if (escaped) escaped = false;
            else if (char === "\\") escaped = true;
            else if (char === '"') inString = false;
            continue;
        }

        if (char === '"') inString = true;
        else if (char === "{") depth++;
        else if (char === "}" && --depth === 0) return text.slice(from, i + 1);
    }

    return null;
}

function salaryText(value: unknown): string | null {
    const salary = value as Record<string, unknown> | undefined;
    const min = Number(salary?.min ?? 0);
    if (!salary || !min) return null;

    const max = Number(salary.max ?? 0);
    const range = max > min ? `${min} - ${max}` : String(min);
    return [range, clean(salary.currency), clean(salary.period)].filter(Boolean).join(" ");
}

/** Wuzzuf stores some company sites bare ("www.example.com"); make them fetchable. */
function normalizeWebsite(value: unknown): string | null {
    const raw = clean(value);
    if (!raw) return null;
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
