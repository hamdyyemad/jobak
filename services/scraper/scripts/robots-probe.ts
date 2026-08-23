/**
 * Checks the robots parser against the live rules of every host we fetch.
 *
 * Enforcing robots.txt is the one enhancement here that can *break* collection:
 * a parser that reads a rule too broadly silently turns a working source into a
 * dead one, and it would look exactly like the site having blocked us. So every
 * URL this service actually requests is checked against the real robots.txt,
 * and anything disallowed is reported loudly.
 *
 * It also prints each host's `Crawl-delay`, which is now applied by the fetch
 * layer rather than promised in a comment.
 *
 *   npx tsx scripts/robots-probe.ts
 */
import { isAllowed, parseRobots } from "../src/lib/robots.js";
import { UA } from "../src/lib/http.js";

/** The real shapes, one per source. Keep in step when a source changes its URLs. */
const URLS: { source: string; url: string; expect: "allow" | "deny" }[] = [
    { source: "wuzzuf", url: "https://wuzzuf.net/sitemap-job-1.xml", expect: "allow" },
    {
        source: "wuzzuf",
        url: "https://wuzzuf.net/jobs/p/abc-senior-backend-developer-acme-cairo-egypt",
        expect: "allow",
    },
    { source: "wuzzuf (blocked route)", url: "https://wuzzuf.net/search/jobs/?q=backend", expect: "deny" },
    { source: "bayt", url: "https://www.bayt.com/en/egypt/jobs/backend-engineer-jobs/", expect: "allow" },
    { source: "bayt (detail)", url: "https://www.bayt.com/en/egypt/jobs/senior-backend-engineer-75056350/", expect: "allow" },
    { source: "talent", url: "https://eg.talent.com/jobs?k=backend", expect: "allow" },
    { source: "talent (detail)", url: "https://eg.talent.com/view?id=618331676492695256", expect: "allow" },
    { source: "forasna", url: "https://forasna.com/%D9%88%D8%B8%D8%A7%D8%A6%D9%81-%D8%AE%D8%A7%D9%84%D9%8A%D8%A9", expect: "allow" },
    { source: "remoteok", url: "https://remoteok.com/api", expect: "allow" },
    // The JSON API this source used to fetch. Kept as a deny expectation so a
    // future edit that reaches for it again fails this probe.
    { source: "remotive (old API)", url: "https://remotive.com/api/remote-jobs", expect: "deny" },
    { source: "remotive", url: "https://remotive.com/remote-jobs/feed", expect: "allow" },
    { source: "jobicy", url: "https://jobicy.com/api/v2/remote-jobs?count=100", expect: "allow" },
    { source: "himalayas", url: "https://himalayas.app/jobs/api?limit=100", expect: "allow" },
    { source: "weworkremotely", url: "https://weworkremotely.com/remote-jobs.rss", expect: "allow" },
    { source: "arbeitnow", url: "https://www.arbeitnow.com/api/job-board-api", expect: "allow" },
    { source: "greenhouse", url: "https://boards-api.greenhouse.io/v1/boards/careem/jobs?content=true", expect: "allow" },
    { source: "ashby", url: "https://api.ashbyhq.com/posting-api/job-board/rain", expect: "allow" },
    { source: "workable", url: "https://apply.workable.com/api/v1/widget/accounts/foodics?details=true", expect: "allow" },
    // Wikidata's search API, which the enrichment resolver used to call. It is
    // under `/w/`, which Wikidata disallows — that is why the resolver is gone.
    { source: "wikidata search (dropped)", url: "https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Careem", expect: "deny" },
    { source: "wikidata entity (allowed)", url: "https://www.wikidata.org/wiki/Special:EntityData/Q123.json", expect: "allow" },
];

const groups = new Map<string, ReturnType<typeof parseRobots>>();

async function groupFor(url: string) {
    const { origin, host } = new URL(url);
    const cached = groups.get(host);
    if (cached) return cached;

    let text = "";
    try {
        const response = await fetch(`${origin}/robots.txt`, {
            headers: { "User-Agent": UA },
            signal: AbortSignal.timeout(15_000),
        });
        if (response.ok) text = await response.text();
    } catch {
        // Fail-open, same as the runtime does.
    }

    const group = parseRobots(text);
    groups.set(host, group);
    return group;
}

let failures = 0;

console.log("SOURCE                      VERDICT  RULES  DELAY   URL");
console.log("-".repeat(110));

for (const entry of URLS) {
    const group = await groupFor(entry.url);
    const { pathname, search } = new URL(entry.url);
    const allowed = isAllowed(group, pathname + search);
    const verdict = allowed ? "allow" : "DENY";
    const wrong = (allowed ? "allow" : "deny") !== entry.expect;

    if (wrong) failures++;

    console.log(
        `${entry.source.padEnd(27)} ${verdict.padEnd(8)} ${String(group.rules.length).padEnd(6)} ` +
            `${(group.crawlDelayMs ? `${group.crawlDelayMs / 1000}s` : "-").padEnd(7)} ` +
            `${entry.url.slice(0, 60)}${wrong ? `   <-- EXPECTED ${entry.expect}` : ""}`
    );
}

console.log("\nCRAWL-DELAY, now enforced by lib/http.ts");
for (const [host, group] of groups) {
    if (group.crawlDelayMs) console.log(`  ${host.padEnd(24)} ${group.crawlDelayMs / 1000}s between requests`);
}

console.log(`\n${failures === 0 ? "all verdicts as expected" : `${failures} UNEXPECTED VERDICT(S)`}`);
process.exitCode = failures === 0 ? 0 : 1;
