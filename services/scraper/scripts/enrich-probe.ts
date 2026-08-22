/**
 * Runs company enrichment against real companies and prints what it resolved.
 *
 * The counterpart to `probe.ts` for `/api/enrich`. Same reasoning: the chain
 * here is homepage → footer → LinkedIn/careers, and every link in it lives on
 * somebody else's server.
 *
 *   npx tsx scripts/enrich-probe.ts
 */
import { enrichCompany, type CompanyHints } from "../src/enrichment/company.js";
import { searchFromEnv } from "../src/enrichment/search.js";
import { mapLimit } from "../src/lib/http.js";

const search = searchFromEnv();

const CASES: CompanyHints[] = [
    // What Wuzzuf hands over for free — website and LinkedIn, straight off the
    // job page's hydration store.
    { name: "K Line Europe", website: "https://www.kline-europe.com/", linkedin: "https://www.linkedin.com/company/k-line-europe-gmbh/" },
    { name: "Mobi Egypt", website: "www.mobi-egypt.com" },
    // ATS listings: the apply URL is already on a company domain.
    { name: "Foodics", applyUrl: "https://apply.workable.com/j/26B9363EE8" },
    { name: "Instabug", website: "https://instabug.com" },
    { name: "Careem", website: "https://www.careem.com" },
    { name: "Swvl", website: "https://swvl.com" },
    { name: "Vezeeta", website: "https://www.vezeeta.com" },
    { name: "Tabby", website: "https://tabby.ai" },
    // Nothing to go on. Resolves only when a search provider is configured.
    { name: "Some Company Nobody Named" },
];

console.log(`search provider: ${search ? "configured" : "none (set BRAVE_SEARCH_API_KEY to enable)"}\n`);

const controller = new AbortController();
const started = Date.now();

const profiles = await mapLimit(CASES, 4, (hint) => enrichCompany(hint, controller.signal, search));

console.log("COMPANY              VIA         WEBSITE                              LINKEDIN                             CAREERS");
console.log("─".repeat(150));
for (const profile of profiles) {
    console.log(
        profile.name.slice(0, 20).padEnd(21),
        profile.resolvedVia.padEnd(11),
        (profile.website ?? "—").slice(0, 36).padEnd(37),
        (profile.linkedin ?? "—").slice(0, 36).padEnd(37),
        profile.careers ?? "—"
    );
}

const resolved = profiles.filter((p) => p.website).length;
console.log(
    `\n${resolved}/${profiles.length} websites · ` +
        `${profiles.filter((p) => p.linkedin).length} linkedin · ` +
        `${profiles.filter((p) => p.careers).length} careers · ${Date.now() - started}ms`
);
