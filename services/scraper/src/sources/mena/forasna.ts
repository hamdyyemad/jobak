import { JobSource } from "../../core/JobSource.js";
import type { ScrapedJob, SearchContext, SourceDescriptor } from "../../core/types.js";
import { HtmlCardStrategy } from "../../strategies/HtmlCardStrategy.js";
import { matchesQuery } from "../../filters/relevance.js";
import { decodeEntities } from "../../lib/html.js";
import { clean, stripHtml, toTimestamp } from "../../lib/normalize.js";

/**
 * Forasna — Wuzzuf's Arabic-first sister site, aimed at the non-graduate market.
 *
 * Off by default, for two honest reasons.
 *
 * **Its robots.txt asks for `Crawl-delay: 10`.** That rules out the detail-page
 * fan-out every other MENA source here uses — ten seconds a page does not fit
 * in a function budget — so this source makes exactly one request per run and
 * reads the cards the listing page renders server-side. One request per run
 * honours the delay comfortably.
 *
 * **Its pool barely overlaps ours.** The listings are overwhelmingly Arabic and
 * blue-collar — سائق, عامل نظافة, خياطة — while the catalogue the collector
 * sweeps is English professional titles. A search for "Backend Engineer" will
 * match nothing here, and that is the site being what it is rather than the
 * parser being broken. Turn it on for the Arabic administrative and sales
 * titles it genuinely covers (محاسب, سكرتيرة, مندوب مبيعات), where it is the
 * best source in the set.
 */

const CARD = /<div class="content-card card-has-jobs">([\s\S]*?)(?=<div class="content-card|<\/body)/gi;
const LISTING = "https://forasna.com/%D9%88%D8%B8%D8%A7%D8%A6%D9%81-%D8%AE%D8%A7%D9%84%D9%8A%D8%A9";

interface ForasnaCard {
    title: string;
    company: string;
    location: string;
    url: string;
    postedAt: string;
}

export class ForasnaSource extends JobSource<ForasnaCard> {
    readonly descriptor: SourceDescriptor = {
        key: "forasna",
        label: "Forasna",
        kind: "html",
        geo: "country",
        countries: ["EG"],
        language: "ar",
        enabledByDefault: false,
        note: "Arabic, Egypt, non-graduate roles. One request per run — the site asks for Crawl-delay: 10.",
    };

    protected readonly strategy = new HtmlCardStrategy<ForasnaCard>({
        // Its search parameters are ignored server-side (every query returns the
        // same 440KB page), so there is exactly one URL worth asking for and the
        // query is applied here instead.
        urls: () => [LISTING],
        cards: (html) => parseCards(html),
        blockedBy: /just a moment|cf_chl_opt/i,
    });

    protected isRelevant(job: ScrapedJob, ctx: SearchContext): boolean {
        return matchesQuery(ctx.query, job.title, job.company);
    }

    protected toJob(card: ForasnaCard): ScrapedJob | null {
        if (!card.title || !card.url) return null;

        return {
            title: card.title,
            company: card.company || "Confidential",
            location: card.location || "Egypt",
            // The listing card never says; these are overwhelmingly on-site
            // roles and claiming otherwise would put them past the remote gate.
            job_type: "onsite",
            // Card view only. A description would cost one request per job at
            // ten seconds each, which is the trade this source is not making.
            description: "",
            apply_url: card.url,
            salary_text: null,
            posted_at_source: toTimestamp(card.postedAt),
            source_key: this.descriptor.key,
            external_id: card.url,
        };
    }
}

function parseCards(html: string): ForasnaCard[] {
    const cards: ForasnaCard[] = [];

    for (const match of html.matchAll(CARD)) {
        const card = match[1];

        const link = card.match(/href="(https:\/\/forasna\.com\/job\/p\/[^"]+)"/i);
        const title = card.match(/<h2[^>]*class="job-title"[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i);
        if (!link || !title) continue;

        // The company anchor is the one whose title is the "Jobs and Careers at
        // …" tooltip; the logo anchor above it points at the same page.
        const company = card.match(
            /<a[^>]*href="https:\/\/forasna\.com\/company\/[^"]*"[^>]*title="Jobs and Careers at[^"]*"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i
        );
        const location = card.match(/<span[^>]*class="location[^"]*"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i);
        const time = card.match(/<time[^>]*datetime="([^"]+)"/i);

        cards.push({
            title: stripHtml(title[1]),
            company: company ? stripHtml(company[1]) : "",
            location: location ? stripHtml(location[1]) : "",
            url: decodeEntities(clean(link[1])),
            postedAt: time ? time[1] : "",
        });
    }

    return cards;
}
