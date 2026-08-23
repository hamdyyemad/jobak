import type { CompanyLinks } from "../core/types.js";
import { tryFetchText } from "../lib/http.js";
import { absoluteUrl, anchors, footerHtml } from "../lib/html.js";
import { clean, foldForMatch, hostOf } from "../lib/normalize.js";
import { freeResolvers, type WebsiteResolver } from "./resolve.js";

/**
 * Getting from a job ad to the company's own front door.
 *
 * An aggregator's apply button is a redirect through the aggregator. What a
 * candidate actually wants is the employer: their site, their LinkedIn page,
 * and the careers page where the rest of their openings live — including the
 * ones that never got posted to a board.
 *
 * The chain is website → footer → the two links, in that order, and it is
 * tiered by cost:
 *
 *   1. **The source already knows.** Wuzzuf's hydration store carries `website`
 *      and `linkedinProfile` on every company, and a schema.org `JobPosting`
 *      often carries `hiringOrganization.sameAs`. Free, and exact.
 *   2. **The apply URL is already the company's.** True for every ATS listing —
 *      that is what makes them the best rows in the pool.
 *   3. **Resolved.** Wikidata's official-website property, then a verified
 *      domain guess. Both free and both permitted — see `resolve.ts`, which
 *      also records why no search engine is involved.
 *
 * Only step 3 can be wrong, and every result carries how it was reached so a
 * guess never passes for a fact.
 */

export interface CompanyHints {
    name: string;
    /** Whatever the source already told us. */
    website?: string | null;
    linkedin?: string | null;
    /** The job's apply URL — sometimes the company's own domain. */
    applyUrl?: string | null;
}

export interface CompanyProfile extends CompanyLinks {
    name: string;
    /** How the website was arrived at, so a caller can weigh it. */
    resolvedVia: "source" | "apply-url" | "wikidata" | "guess" | "none";
}

/**
 * Hosts that are somebody's job board, never somebody's company site.
 *
 * Without this list step 2 would decide that every Greenhouse listing belongs
 * to a company called Greenhouse, and every Wuzzuf listing to Wuzzuf.
 */
const NOT_A_COMPANY_SITE = [
    // Aggregators and boards
    "wuzzuf.net", "forasna.com", "bayt.com", "talent.com", "linkedin.com",
    "indeed.com", "glassdoor.com", "monster.com", "naukrigulf.com", "gulftalent.com",
    "remoteok.com", "remotive.com", "weworkremotely.com", "himalayas.app",
    "jobicy.com", "arbeitnow.com", "wellfound.com", "angel.co", "ziprecruiter.com",
    // Applicant tracking systems
    "greenhouse.io", "ashbyhq.com", "workable.com", "lever.co", "myworkdayjobs.com",
    "smartrecruiters.com", "bamboohr.com", "recruitee.com", "teamtailor.com",
    "personio.de", "jobvite.com", "icims.com", "taleo.net", "successfactors.com",
    "breezy.hr", "join.com", "pinpointhq.com", "rippling.com", "jazzhr.com",
    // Link shorteners and utilities
    "bit.ly", "google.com", "facebook.com", "twitter.com", "x.com",
];

/** Paths and link text that mean "our open roles", in both languages. */
const CAREERS_PATH = /\/(careers?|jobs?|join-?us|join|work-?with-?us|we-?are-?hiring|hiring|vacanc(?:y|ies)|opportunities|employment)(\/|$|\?)/i;
const CAREERS_TEXT =
    /\b(careers?|jobs?|join us|work with us|we're hiring|were hiring|open roles|open positions|vacancies)\b|وظائف|الوظائف|التوظيف|انضم|فرص عمل/i;

const LINKEDIN_COMPANY = /linkedin\.com\/(company|school)\/([A-Za-z0-9\-_%.]+)/i;

export async function enrichCompany(
    hints: CompanyHints,
    signal: AbortSignal,
    resolvers: WebsiteResolver[] = freeResolvers()
): Promise<CompanyProfile> {
    const name = clean(hints.name);

    const resolved = await resolveWebsite(hints, signal, resolvers);
    const profile: CompanyProfile = {
        name,
        website: resolved.website,
        linkedin: normalizeLinkedin(hints.linkedin) ?? null,
        careers: null,
        resolvedVia: resolved.via,
    };

    // Nothing to crawl, and nothing more to learn.
    if (!profile.website) return profile;

    const html = await tryFetchText(profile.website, signal, { timeoutMs: 6_000 });
    if (!html) return profile;

    profile.linkedin = profile.linkedin ?? findLinkedin(html);
    profile.careers = findCareers(html, profile.website);

    return profile;
}

async function resolveWebsite(
    hints: CompanyHints,
    signal: AbortSignal,
    resolvers: WebsiteResolver[]
): Promise<{ website: string | null; via: CompanyProfile["resolvedVia"] }> {
    const declared = normalizeUrl(hints.website);
    if (declared && isCompanyHost(declared)) return { website: declared, via: "source" };

    const apply = normalizeUrl(hints.applyUrl);
    if (apply && isCompanyHost(apply)) {
        // The listing's own path is not the homepage — keep only the origin.
        try {
            return { website: new URL(apply).origin, via: "apply-url" };
        } catch {
            /* fall through */
        }
    }

    for (const resolver of resolvers) {
        if (!hints.name || signal.aborted) break;

        const found = normalizeUrl(await resolver.resolve(hints.name, signal));
        if (found && isCompanyHost(found)) {
            try {
                return { website: new URL(found).origin, via: resolver.name };
            } catch {
                continue;
            }
        }
    }

    return { website: null, via: "none" };
}

/**
 * The footer first, then the rest of the page.
 *
 * Company sites put their social links in the footer essentially without
 * exception, and searching the whole document first finds "share this on
 * LinkedIn" widgets and employee profiles linked from an about page.
 */
function findLinkedin(html: string): string | null {
    return normalizeLinkedin(footerHtml(html).match(LINKEDIN_COMPANY)?.[0])
        ?? normalizeLinkedin(html.match(LINKEDIN_COMPANY)?.[0]);
}

/**
 * The careers page, preferring the shortest same-site path that looks like one.
 *
 * Shortest wins because `/careers` is the hub and `/careers/engineering/senior-
 * backend-engineer-2024` is one listing inside it — and a site that has both
 * will link to both from the same nav.
 */
function findCareers(html: string, website: string): string | null {
    const site = hostOf(website);
    if (!site) return null;

    const candidates = anchors(html, website)
        .filter((anchor) => {
            const host = hostOf(anchor.href);
            // A careers page on a subdomain (jobs.acme.com) still counts; a
            // careers page on someone else's domain is their board, not this
            // company's page.
            if (!host || !(host === site || host.endsWith(`.${site}`) || site.endsWith(`.${host}`))) return false;
            return CAREERS_PATH.test(anchor.href) || CAREERS_TEXT.test(anchor.text);
        })
        .map((anchor) => anchor.href);

    if (candidates.length === 0) return null;

    return candidates.sort((a, b) => pathLength(a) - pathLength(b))[0];
}

function pathLength(url: string): number {
    try {
        return new URL(url).pathname.length;
    } catch {
        return url.length;
    }
}

/** `linkedin.com/company/acme-inc/about` → `https://www.linkedin.com/company/acme-inc`. */
function normalizeLinkedin(value: unknown): string | null {
    const match = clean(value).match(LINKEDIN_COMPANY);
    if (!match) return null;

    const slug = match[2].replace(/\/$/, "");
    if (!slug) return null;

    return `https://www.linkedin.com/${match[1].toLowerCase()}/${slug}`;
}

function normalizeUrl(value: unknown): string | null {
    const raw = clean(value);
    if (!raw) return null;
    const absolute = absoluteUrl(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`, "https://example.invalid");
    return absolute || null;
}

function isCompanyHost(url: string): boolean {
    const host = hostOf(url);
    if (!host) return false;
    return !NOT_A_COMPANY_SITE.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
}
