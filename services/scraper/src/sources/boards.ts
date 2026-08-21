import type { ScrapedJob, ScrapeParams, SourceAdapter } from "../types.js";
import {
    clean,
    fetchJson,
    fetchText,
    inferJobType,
    canonicalUrl,
    pick,
    stripHtml,
    toTimestamp,
    truncate,
} from "../normalize.js";

const DESC_MAX = 4000;

/**
 * Remote job boards that publish a free, documented, no-auth JSON feed.
 *
 * These are the reason a self-hosted scraper is viable at all: they are not
 * scraping targets, they are public APIs the boards want consumed. No proxy, no
 * browser, no per-request cost, and no terms-of-service grey area.
 *
 * Every one returns its whole current feed in a single call, so the query is
 * applied here rather than by the source.
 */

/**
 * Does this posting plausibly answer the query?
 *
 * None of these APIs support server-side search — `?search=`, `?tag=` and
 * friends are accepted and silently ignored — so matching happens here, against
 * a feed of only the few hundred most recent postings.
 *
 * Requiring every query word to appear was too strict at that pool size:
 * "Backend Engineer" returned nothing while the feed held plenty of relevant
 * work. A hit on the title, or the full phrase anywhere, is the better trade —
 * recall matters more here because the AI scorer downstream does the precise
 * filtering and is the thing that actually decides what the user sees.
 */
function matches(query: string, title: unknown, ...rest: unknown[]): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    const titleText = String(title ?? "").toLowerCase();
    const allText = [titleText, ...rest.map((f) => String(f ?? "").toLowerCase())].join(" ");

    const words = q.split(/\s+/).filter((w) => w.length > 2);

    /*
     * A single-word query must hit the TITLE. Allowing "engineer" to match
     * anywhere pulled in "Laborer" and "Store Manager" — every job description
     * mentions engineers somewhere, so body text carries almost no signal for
     * one common word.
     */
    if (words.length <= 1) return titleText.includes(q);

    // A multi-word phrase appearing intact is unambiguous wherever it sits.
    if (allText.includes(q)) return true;

    // Otherwise: any meaningful word in the title, or every word somewhere.
    return words.some((w) => titleText.includes(w)) || words.every((w) => allText.includes(w));
}

export const remoteok: SourceAdapter = {
    key: "remoteok",
    label: "RemoteOK",
    kind: "api",
    geo: "remote-only",
    note: "Public JSON feed. First element is a legal notice, not a job.",
    async fetchJobs(params, signal) {
        const rows = await fetchJson<Record<string, unknown>[]>("https://remoteok.com/api", signal);
        return rows
            // Element 0 is RemoteOK's attribution/legal object.
            .filter((r) => r && r.id && r.position)
            .filter((r) => matches(params.query, r.position, r.description, r.tags))
            .slice(0, params.limit)
            .map<ScrapedJob>((r) => ({
                title: clean(r.position),
                company: clean(r.company) || "Unknown",
                location: clean(r.location) || "Remote",
                job_type: "remote",
                description: truncate(stripHtml(r.description), DESC_MAX),
                apply_url: canonicalUrl(pick(r, ["url", "apply_url"], "")),
                salary_text:
                    Number(r.salary_min) > 0
                        ? `${r.salary_min} - ${r.salary_max}`
                        : null,
                posted_at_source: toTimestamp(pick(r, ["date", "epoch"], null)),
                source_key: "remoteok",
                external_id: String(r.id),
            }));
    },
};

export const remotive: SourceAdapter = {
    key: "remotive",
    label: "Remotive",
    kind: "api",
    geo: "remote-only",
    async fetchJobs(params, signal) {
        const data = await fetchJson<{ jobs?: Record<string, unknown>[] }>(
            // `?search=` and `?limit=` are accepted and ignored; this is the whole feed.
            "https://remotive.com/api/remote-jobs",
            signal
        );
        return (data.jobs ?? [])
            .filter((r) => matches(params.query, r.title, r.tags, r.category))
            .slice(0, params.limit)
            .map<ScrapedJob>((r) => ({
                title: clean(r.title),
                company: clean(r.company_name) || "Unknown",
                location: clean(r.candidate_required_location) || "Remote",
                job_type: "remote",
                description: truncate(stripHtml(r.description), DESC_MAX),
                apply_url: canonicalUrl(r.url),
                salary_text: clean(r.salary) || null,
                posted_at_source: toTimestamp(r.publication_date),
                source_key: "remotive",
                external_id: String(r.id),
            }));
    },
};

export const arbeitnow: SourceAdapter = {
    key: "arbeitnow",
    label: "Arbeitnow",
    kind: "api",
    geo: "company",
    note: "Europe-weighted. Descriptions arrive double HTML-encoded.",
    async fetchJobs(params, signal) {
        // The only source here that paginates. Two pages is ~350 postings, which
        // is plenty against a per-source limit and keeps the run inside its
        // timeout budget.
        const rows: Record<string, unknown>[] = [];
        let url: string | null = "https://www.arbeitnow.com/api/job-board-api";
        for (let page = 0; page < 2 && url; page++) {
            const data: { data?: Record<string, unknown>[]; links?: { next?: string | null } } =
                await fetchJson(url, signal);
            rows.push(...(data.data ?? []));
            url = data.links?.next ?? null;
        }

        return rows
            .filter((r) => matches(params.query, r.title, r.tags, r.description))
            .slice(0, params.limit)
            .map<ScrapedJob>((r) => ({
                title: clean(r.title),
                company: clean(r.company_name) || "Unknown",
                location: clean(r.location) || (r.remote ? "Remote" : "Not specified"),
                job_type: r.remote ? "remote" : inferJobType(r.title, r.location, r.job_types),
                description: truncate(stripHtml(r.description), DESC_MAX),
                apply_url: canonicalUrl(r.url),
                salary_text: null,
                posted_at_source: toTimestamp(r.created_at),
                source_key: "arbeitnow",
                external_id: clean(r.slug),
            }));
    },
};

export const jobicy: SourceAdapter = {
    key: "jobicy",
    label: "Jobicy",
    kind: "api",
    geo: "remote-only",
    async fetchJobs(params, signal) {
        const data = await fetchJson<{ jobs?: Record<string, unknown>[] }>(
            `https://jobicy.com/api/v2/remote-jobs?count=${Math.min(params.limit * 4, 100)}`,
            signal
        );
        return (data.jobs ?? [])
            .filter((r) => matches(params.query, r.jobTitle, r.jobExcerpt, r.jobIndustry))
            .slice(0, params.limit)
            .map<ScrapedJob>((r) => ({
                title: clean(r.jobTitle),
                company: clean(r.companyName) || "Unknown",
                location: clean(r.jobGeo) || "Anywhere",
                job_type: "remote",
                description: truncate(stripHtml(pick(r, ["jobDescription", "jobExcerpt"], "")), DESC_MAX),
                apply_url: canonicalUrl(r.url),
                salary_text:
                    Number(r.salaryMin) > 0
                        ? `${r.salaryMin}-${r.salaryMax} ${clean(r.salaryCurrency)} ${clean(r.salaryPeriod)}`.trim()
                        : null,
                posted_at_source: toTimestamp(r.pubDate),
                source_key: "jobicy",
                external_id: String(r.id),
            }));
    },
};

export const himalayas: SourceAdapter = {
    key: "himalayas",
    label: "Himalayas",
    kind: "api",
    geo: "remote-only",
    async fetchJobs(params, signal) {
        const data = await fetchJson<{ jobs?: Record<string, unknown>[] }>(
            `https://himalayas.app/jobs/api?limit=${Math.min(params.limit * 4, 100)}`,
            signal
        );
        return (data.jobs ?? [])
            .filter((r) => matches(params.query, r.title, r.excerpt, r.categories))
            .slice(0, params.limit)
            .map<ScrapedJob>((r) => {
                const restrictions = Array.isArray(r.locationRestrictions)
                    ? (r.locationRestrictions as string[]).join(", ")
                    : "";
                return {
                    title: clean(r.title),
                    company: clean(r.companyName) || "Unknown",
                    location: restrictions || "Anywhere",
                    job_type: "remote",
                    description: truncate(stripHtml(pick(r, ["description", "excerpt"], "")), DESC_MAX),
                    apply_url: canonicalUrl(pick(r, ["applicationLink", "guid"], "")),
                    salary_text:
                        Number(r.minSalary) > 0
                            ? `${r.minSalary}-${r.maxSalary} ${clean(r.currency)} ${clean(r.salaryPeriod)}`.trim()
                            : null,
                    posted_at_source: toTimestamp(r.pubDate),
                    source_key: "himalayas",
                    external_id: clean(pick(r, ["guid", "applicationLink"], "")),
                };
            });
    },
};

export const weworkremotely: SourceAdapter = {
    key: "weworkremotely",
    label: "We Work Remotely",
    kind: "rss",
    geo: "remote-only",
    note: "RSS. Company and title share one <title> field, split on ':'.",
    async fetchJobs(params, signal) {
        const xml = await fetchText("https://weworkremotely.com/remote-jobs.rss", signal);
        const items = xml.split("<item>").slice(1);
        const jobs: ScrapedJob[] = [];

        for (const item of items) {
            const tag = (name: string) => {
                const m = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
                if (!m) return "";
                return clean(m[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, ""));
            };

            const rawTitle = tag("title");
            const link = tag("link");
            if (!rawTitle || !link) continue;

            // "Company Name: Senior Backend Engineer"
            const split = rawTitle.indexOf(":");
            const company = split > 0 ? rawTitle.slice(0, split).trim() : "Unknown";
            const title = split > 0 ? rawTitle.slice(split + 1).trim() : rawTitle;

            const description = stripHtml(tag("description"));
            if (!matches(params.query, title, description)) continue;

            jobs.push({
                title,
                company,
                location: tag("region") || "Anywhere",
                job_type: "remote",
                description: truncate(description, DESC_MAX),
                apply_url: canonicalUrl(link),
                salary_text: null,
                posted_at_source: toTimestamp(tag("pubDate")),
                source_key: "weworkremotely",
                external_id: canonicalUrl(link),
            });
            if (jobs.length >= params.limit) break;
        }
        return jobs;
    },
};

/**
 * Wuzzuf, via its public SEO route.
 *
 * `/search/jobs/` sits behind a Cloudflare challenge and answers any plain HTTP
 * client with a 403. The `/a/{Query}-Jobs-in-{Country}` route serves the same
 * listings unchallenged. That may change without notice — the parser reports
 * zero jobs rather than throwing if it does.
 */
export const wuzzuf: SourceAdapter = {
    key: "wuzzuf",
    label: "Wuzzuf",
    kind: "html",
    geo: "country",
    countries: ["EG"],
    note: "Egypt-focused. Parses the public /a/ route; the search route is Cloudflare-protected.",
    async fetchJobs(params, signal) {
        const slugify = (s: string) =>
            s
                .replace(/[^a-zA-Z0-9\s-]/g, " ")
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
                .join("-");

        const country = params.countries.find((c) => c.code === "EG")?.name ?? "Egypt";
        const url = `https://wuzzuf.net/a/${slugify(params.query) || "Software-Engineering"}-Jobs-in-${slugify(country)}`;

        const html = await fetchText(url, signal);
        if (/just a moment|cf_chl_opt|challenge-error/i.test(html)) {
            throw new Error("Cloudflare challenge — the /a/ route is now protected");
        }

        // Index every job link first so each card is bounded by the next one;
        // otherwise company and skills bleed across cards.
        const anchors: { index: number; length: number; path: string; titleHtml: string }[] = [];
        const re = /<a[^>]+href="(\/jobs\/p\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let m: RegExpExecArray | null;
        while ((m = re.exec(html)) !== null) {
            anchors.push({ index: m.index, length: m[0].length, path: m[1], titleHtml: m[2] });
        }

        const jobs: ScrapedJob[] = [];
        const seen = new Set<string>();
        for (let i = 0; i < anchors.length && jobs.length < params.limit; i++) {
            const cur = anchors[i];
            const title = stripHtml(cur.titleHtml);
            if (!title || title.length < 2 || seen.has(cur.path)) continue;
            seen.add(cur.path);

            const bodyStart = cur.index + cur.length;
            const nextStart = anchors[i + 1] ? anchors[i + 1].index : html.length;
            const after = html.slice(bodyStart, Math.min(nextStart, bodyStart + 6000));

            const companyMatch = after.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
            const company = companyMatch ? stripHtml(companyMatch[1]).replace(/\s*-\s*$/, "") : "";

            let location = "";
            if (companyMatch) {
                const off = after.indexOf(companyMatch[0]) + companyMatch[0].length;
                const locMatch = after.slice(off, off + 1500).match(/<span[^>]*>([\s\S]*?)<\/span>/i);
                if (locMatch) location = stripHtml(locMatch[1]).replace(/,\s*$/, "");
            }

            const chip = after.match(/<span[^>]*>\s*(On-site|Onsite|Remote|Hybrid)\s*<\/span>/i);
            const posted = after.match(/>([^<>]*\b(?:hour|day|month|minute|week|year)s?\s+ago)\s*</i);
            const exp = after.match(/([0-9]+\+?\s*(?:-\s*[0-9]+)?\s*Yrs? of Exp)/i);

            // The listing page carries no full description; the chips are what
            // the scorer downstream gets to work with.
            const skills: string[] = [];
            const skillRe = /<a[^>]+href="\/a\/[^"]*"[^>]*>\s*·\s*([^<]{2,80})<\/a>/gi;
            let sm: RegExpExecArray | null;
            while ((sm = skillRe.exec(after)) !== null && skills.length < 12) {
                const t = stripHtml(sm[1]).replace(/^[·•\s]+/, "");
                if (t && !/Jobs in/i.test(t) && !skills.includes(t)) skills.push(t);
            }

            const descParts: string[] = [];
            if (exp) descParts.push(`Experience: ${stripHtml(exp[1])}`);
            if (skills.length) descParts.push(`Skills: ${skills.join(", ")}`);

            jobs.push({
                title,
                company: company || "Confidential",
                location: location || country,
                job_type: chip ? inferJobType(chip[1]) : "onsite",
                description: truncate(descParts.join(". "), DESC_MAX),
                apply_url: canonicalUrl(`https://wuzzuf.net${cur.path}`),
                salary_text: null,
                posted_at_source: toTimestamp(posted ? posted[1] : null),
                source_key: "wuzzuf",
                external_id: cur.path,
            });
        }
        return jobs;
    },
};

/**
 * LinkedIn's logged-out guest endpoint.
 *
 * Server-rendered job cards, no auth. It answers readily from a residential IP
 * and is the most likely of all sources to refuse a datacenter one, which is
 * exactly what a proxy service sells. Treated as best-effort: if it returns an
 * auth wall, the source reports zero rather than failing the run.
 */
export const linkedin: SourceAdapter = {
    key: "linkedin",
    label: "LinkedIn (guest)",
    kind: "html",
    geo: "company",
    note: "Best-effort. Frequently blocked from datacenter IPs — expect zero results on Vercel.",
    async fetchJobs(params, signal) {
        const location = params.worldwide
            ? "Worldwide"
            : params.countries[0]?.name ?? "Worldwide";

        const base =
            "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search" +
            `?keywords=${encodeURIComponent(params.query)}` +
            `&location=${encodeURIComponent(location)}` +
            "&f_TPR=r604800";

        const jobs: ScrapedJob[] = [];
        const seen = new Set<string>();
        // 10 cards per page; stop as soon as we have enough or a page is empty.
        for (let page = 0; page < 3 && jobs.length < params.limit; page++) {
            const html = await fetchText(`${base}&start=${page * 10}`, signal);
            if (/authwall|login__form|<title>\s*Sign/i.test(html)) {
                throw new Error("auth wall — this IP is not trusted by LinkedIn");
            }

            const cards = html.split(/<div class="base-card[^"]*"/i).slice(1);
            if (cards.length === 0) break;

            for (const card of cards) {
                const link = card.match(/<a[^>]+class="base-card__full-link[^"]*"[^>]*href="([^"]+)"/i);
                const titleM = card.match(/<h3[^>]*class="base-search-card__title"[^>]*>([\s\S]*?)<\/h3>/i);
                if (!link || !titleM) continue;

                const apply_url = canonicalUrl(link[1].split("?")[0]);
                const title = stripHtml(titleM[1]);
                if (!title || seen.has(apply_url)) continue;
                seen.add(apply_url);

                const urn = card.match(/data-entity-urn="urn:li:jobPosting:(\d+)"/i);
                const comp = card.match(/<h4[^>]*class="base-search-card__subtitle"[^>]*>([\s\S]*?)<\/h4>/i);
                const loc = card.match(/<span[^>]*class="job-search-card__location"[^>]*>([\s\S]*?)<\/span>/i);
                const time = card.match(/<time[^>]*datetime="([^"]+)"/i);
                const sal = card.match(/<span[^>]*class="job-search-card__salary-info"[^>]*>([\s\S]*?)<\/span>/i);

                const locationText = loc ? stripHtml(loc[1]) : "";
                jobs.push({
                    title,
                    company: comp ? stripHtml(comp[1]) : "Unknown",
                    location: locationText || "Not specified",
                    job_type: inferJobType(title, locationText),
                    // The search fragment carries no description.
                    description: "",
                    apply_url,
                    salary_text: sal ? stripHtml(sal[1]) : null,
                    posted_at_source: toTimestamp(time ? time[1] : null),
                    source_key: "linkedin",
                    external_id: urn ? urn[1] : apply_url,
                });
                if (jobs.length >= params.limit) break;
            }
        }
        return jobs;
    },
};

/**
 * Applicant tracking systems, per company.
 *
 * Greenhouse, Ashby and Workable publish every open role at a company as JSON so
 * the company can embed its own board. Highest-quality listings available — full
 * descriptions, first-party, always current — and completely free. The catch is
 * that you have to know which companies to ask, so the caller supplies slugs.
 */
function atsAdapter(
    key: string,
    label: string,
    url: (slug: string) => string,
    extract: (payload: unknown, slug: string) => Record<string, unknown>[],
    map: (row: Record<string, unknown>, slug: string) => ScrapedJob
): SourceAdapter {
    return {
        key,
        label,
        kind: "ats",
        geo: "company",
        note: "Needs company slugs via the `ats` request field.",
        async fetchJobs(params: ScrapeParams, signal: AbortSignal) {
            const slugs = params.ats?.[key] ?? [];
            if (slugs.length === 0) return [];

            const perCompany = await Promise.allSettled(
                slugs.map(async (slug) => {
                    const payload = await fetchJson<unknown>(url(slug), signal);
                    return extract(payload, slug).map((row) => map(row, slug));
                })
            );

            const jobs = perCompany.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
            return jobs
                .filter((j) => matches(params.query, j.title, j.description))
                .slice(0, params.limit);
        },
    };
}

export const greenhouse = atsAdapter(
    "greenhouse",
    "Greenhouse boards",
    (slug) => `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`,
    (payload) => ((payload as { jobs?: Record<string, unknown>[] }).jobs ?? []),
    (row, slug) => ({
        title: clean(row.title),
        company: slug,
        location: clean(pick(row, ["location.name"], "")) || "Not specified",
        job_type: inferJobType(row.title, pick(row, ["location.name"], "")),
        description: truncate(stripHtml(row.content), DESC_MAX),
        apply_url: canonicalUrl(row.absolute_url),
        salary_text: null,
        posted_at_source: toTimestamp(pick(row, ["updated_at", "first_published"], null)),
        source_key: "greenhouse",
        external_id: String(row.id),
    })
);

export const ashby = atsAdapter(
    "ashby",
    "Ashby boards",
    (slug) => `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}?includeCompensation=true`,
    (payload) => ((payload as { jobs?: Record<string, unknown>[] }).jobs ?? []),
    (row, slug) => ({
        title: clean(pick(row, ["title"], "")),
        company: clean(pick(row, ["companyName"], slug)) || slug,
        location: clean(pick(row, ["location"], "")) || "Not specified",
        job_type: row.isRemote ? "remote" : inferJobType(row.title, row.location, row.employmentType),
        description: truncate(stripHtml(pick(row, ["descriptionPlain", "descriptionHtml"], "")), DESC_MAX),
        apply_url: canonicalUrl(pick(row, ["jobUrl", "applyUrl"], "")),
        salary_text: clean(pick(row, ["compensation.compensationTierSummary"], "")) || null,
        posted_at_source: toTimestamp(pick(row, ["publishedAt", "updatedAt"], null)),
        source_key: "ashby",
        external_id: String(pick(row, ["id"], "")),
    })
);

export const workable = atsAdapter(
    "workable",
    "Workable boards",
    (slug) => `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}?details=true`,
    (payload) => ((payload as { jobs?: Record<string, unknown>[] }).jobs ?? []),
    (row, slug) => ({
        title: clean(pick(row, ["title"], "")),
        company: slug,
        location: clean(pick(row, ["location", "city"], "")) || "Not specified",
        job_type: inferJobType(row.title, row.location, row.type),
        description: truncate(stripHtml(pick(row, ["description"], "")), DESC_MAX),
        apply_url: canonicalUrl(pick(row, ["url", "shortlink", "application_url"], "")),
        salary_text: null,
        posted_at_source: toTimestamp(pick(row, ["published_on", "created_at"], null)),
        source_key: "workable",
        external_id: String(pick(row, ["shortcode", "id"], "")),
    })
);
